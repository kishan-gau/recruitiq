/**
 * ApplicationService Unit Tests
 * Tests all business logic for application management
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ApplicationService } from '../ApplicationService.js';
import { ValidationError, BusinessRuleError, NotFoundError } from '../../../middleware/errorHandler.js';

// Mock dependencies at top level
jest.mock('../../../config/database.js');
jest.mock('../../../utils/logger.js');
jest.mock('../../../repositories/ApplicationRepository.js');
jest.mock('../../../repositories/JobRepository.js');
jest.mock('../../../repositories/CandidateRepository.js');
jest.mock('../../../models/Organization.js');

describe('ApplicationService', () => {
  let applicationService;
  let mockApplicationRepository;
  let mockJobRepository;
  let mockCandidateRepository;
  let mockOrganization;
  let mockUser;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Dynamic imports after mocks are set up
    const { ApplicationRepository } = await import('../../../repositories/ApplicationRepository.js');
    const { JobRepository } = await import('../../../repositories/JobRepository.js');
    const { CandidateRepository } = await import('../../../repositories/CandidateRepository.js');
    mockOrganization = (await import('../../../models/Organization.js')).default;
    
    applicationService = new ApplicationService();
    mockApplicationRepository = applicationService.applicationRepository;
    mockJobRepository = applicationService.jobRepository;
    mockCandidateRepository = applicationService.candidateRepository;

    // Mock user for tests
    mockUser = {
      id: 'user-123',
      organization_id: 'org-123',
      role: 'admin'
    };
  });

  const validApplicationData = {
    candidate_id: 'candidate-123',
    job_id: 'job-123',
    cover_letter: 'I am very interested in this position...',
    source: 'website',
    referrer_name: null,
    answers: { question1: 'answer1' },
    metadata: {}
  };

  describe('create', () => {
    it('should create an application with valid data', async () => {
      const mockJob = {
        id: 'job-123',
        title: 'Software Engineer',
        status: 'open',
        is_published: true,
        organization_id: 'org-123'
      };
      mockJobRepository.findById = jest.fn().mockResolvedValue(mockJob);

      const mockCandidate = {
        id: 'candidate-123',
        name: 'John Doe',
        organization_id: 'org-123'
      };
      mockCandidateRepository.findById = jest.fn().mockResolvedValue(mockCandidate);

      mockApplicationRepository.findByCandidateAndJob = jest.fn().mockResolvedValue(null);

      const mockCreatedApplication = {
        id: 'app-123',
        ...validApplicationData,
        status: 'applied',
        applied_at: new Date(),
        created_by: 'user-123',
        organization_id: 'org-123'
      };
      mockApplicationRepository.create = jest.fn().mockResolvedValue(mockCreatedApplication);

      const result = await applicationService.create(validApplicationData, mockUser);

      expect(mockJobRepository.findById).toHaveBeenCalledWith('job-123', 'org-123');
      expect(mockCandidateRepository.findById).toHaveBeenCalledWith('candidate-123', 'org-123');
      expect(mockApplicationRepository.findByCandidateAndJob).toHaveBeenCalledWith(
        'candidate-123',
        'job-123',
        'org-123'
      );
      expect(mockApplicationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validApplicationData,
          status: 'applied',
          applied_at: expect.any(Date),
          created_by: 'user-123'
        }),
        'org-123'
      );
      expect(result).toEqual(mockCreatedApplication);
    });

    it('should throw ValidationError for invalid data', async () => {
      const invalidData = {
        candidate_id: 'not-a-uuid'
      };

      await expect(applicationService.create(invalidData, mockUser)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when job does not exist', async () => {
      mockJobRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(applicationService.create(validApplicationData, mockUser)).rejects.toThrow(NotFoundError);
    });

    it('should throw BusinessRuleError when applying to closed job', async () => {
      const mockClosedJob = {
        id: 'job-123',
        status: 'closed',
        is_published: true,
        organization_id: 'org-123'
      };
      mockJobRepository.findById = jest.fn().mockResolvedValue(mockClosedJob);

      await expect(applicationService.create(validApplicationData, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(applicationService.create(validApplicationData, mockUser)).rejects.toThrow(/closed job/);
    });

    it('should throw BusinessRuleError when applying to unpublished job', async () => {
      const mockUnpublishedJob = {
        id: 'job-123',
        status: 'open',
        is_published: false,
        organization_id: 'org-123'
      };
      mockJobRepository.findById = jest.fn().mockResolvedValue(mockUnpublishedJob);

      await expect(applicationService.create(validApplicationData, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(applicationService.create(validApplicationData, mockUser)).rejects.toThrow(/unpublished job/);
    });

    it('should throw NotFoundError when candidate does not exist', async () => {
      const mockJob = {
        id: 'job-123',
        status: 'open',
        is_published: true,
        organization_id: 'org-123'
      };
      mockJobRepository.findById = jest.fn().mockResolvedValue(mockJob);
      mockCandidateRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(applicationService.create(validApplicationData, mockUser)).rejects.toThrow(NotFoundError);
    });

    it('should throw BusinessRuleError for duplicate application', async () => {
      const mockJob = {
        id: 'job-123',
        status: 'open',
        is_published: true,
        organization_id: 'org-123'
      };
      mockJobRepository.findById = jest.fn().mockResolvedValue(mockJob);

      const mockCandidate = {
        id: 'candidate-123',
        organization_id: 'org-123'
      };
      mockCandidateRepository.findById = jest.fn().mockResolvedValue(mockCandidate);

      const mockExistingApplication = {
        id: 'existing-app-123',
        candidate_id: 'candidate-123',
        job_id: 'job-123'
      };
      mockApplicationRepository.findByCandidateAndJob = jest.fn().mockResolvedValue(mockExistingApplication);

      await expect(applicationService.create(validApplicationData, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(applicationService.create(validApplicationData, mockUser)).rejects.toThrow(/already applied/);
    });
  });

  describe('getById', () => {
    it('should get application by id with details', async () => {
      const mockApplication = {
        id: 'app-123',
        candidate_id: 'candidate-123',
        job_id: 'job-123',
        status: 'screening',
        organization_id: 'org-123',
        candidate: { name: 'John Doe' },
        job: { title: 'Software Engineer' }
      };
      mockApplicationRepository.findByIdWithDetails = jest.fn().mockResolvedValue(mockApplication);

      const result = await applicationService.getById('app-123', mockUser);

      expect(mockApplicationRepository.findByIdWithDetails).toHaveBeenCalledWith('app-123', 'org-123');
      expect(result).toEqual(mockApplication);
    });

    it('should throw NotFoundError when application does not exist', async () => {
      mockApplicationRepository.findByIdWithDetails = jest.fn().mockResolvedValue(null);

      await expect(applicationService.getById('app-999', mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    const updateData = {
      notes: 'Candidate looks promising',
      reviewed_by: 'user-123'
    };

    it('should update application with valid data', async () => {
      const mockExistingApplication = {
        id: 'app-123',
        status: 'screening',
        organization_id: 'org-123'
      };
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(mockExistingApplication);

      const mockUpdatedApplication = {
        ...mockExistingApplication,
        ...updateData,
        updated_by: 'user-123'
      };
      mockApplicationRepository.update = jest.fn().mockResolvedValue(mockUpdatedApplication);

      const result = await applicationService.update('app-123', updateData, mockUser);

      expect(mockApplicationRepository.findById).toHaveBeenCalledWith('app-123', 'org-123');
      expect(mockApplicationRepository.update).toHaveBeenCalledWith(
        'app-123',
        expect.objectContaining({
          ...updateData,
          updated_by: 'user-123'
        }),
        'org-123'
      );
      expect(result).toEqual(mockUpdatedApplication);
    });

    it('should throw ValidationError for invalid update data', async () => {
      const invalidData = {
        status: 'invalid-status'
      };

      await expect(applicationService.update('app-123', invalidData, mockUser)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when application does not exist', async () => {
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(applicationService.update('app-999', updateData, mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete application that is not hired', async () => {
      const mockApplication = {
        id: 'app-123',
        status: 'screening',
        organization_id: 'org-123'
      };
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(mockApplication);
      mockApplicationRepository.delete = jest.fn().mockResolvedValue(true);

      await applicationService.delete('app-123', mockUser);

      expect(mockApplicationRepository.findById).toHaveBeenCalledWith('app-123', 'org-123');
      expect(mockApplicationRepository.delete).toHaveBeenCalledWith('app-123', 'org-123');
    });

    it('should throw BusinessRuleError when deleting hired application', async () => {
      const mockHiredApplication = {
        id: 'app-123',
        status: 'hired',
        organization_id: 'org-123'
      };
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(mockHiredApplication);

      await expect(applicationService.delete('app-123', mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(applicationService.delete('app-123', mockUser)).rejects.toThrow(/hired/);
      expect(mockApplicationRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when application does not exist', async () => {
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(applicationService.delete('app-999', mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('search', () => {
    it('should search applications with filters', async () => {
      const filters = {
        status: 'screening',
        job_id: 'job-123',
        page: 1,
        limit: 20
      };

      const mockSearchResult = {
        applications: [
          { id: 'app-1', status: 'screening' },
          { id: 'app-2', status: 'screening' }
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      };
      mockApplicationRepository.search = jest.fn().mockResolvedValue(mockSearchResult);

      const result = await applicationService.search(filters, mockUser);

      expect(mockApplicationRepository.search).toHaveBeenCalledWith(filters, 'org-123');
      expect(result).toEqual(mockSearchResult);
    });

    it('should handle empty search results', async () => {
      const filters = { page: 1, limit: 20 };
      const mockEmptyResult = {
        applications: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      };
      mockApplicationRepository.search = jest.fn().mockResolvedValue(mockEmptyResult);

      const result = await applicationService.search(filters, mockUser);

      expect(result.applications).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getByJob', () => {
    it('should get applications by job', async () => {
      const mockApplications = [
        { id: 'app-1', job_id: 'job-123', status: 'screening' },
        { id: 'app-2', job_id: 'job-123', status: 'interview' }
      ];
      mockApplicationRepository.findByJob = jest.fn().mockResolvedValue(mockApplications);

      const result = await applicationService.getByJob('job-123', mockUser);

      expect(mockApplicationRepository.findByJob).toHaveBeenCalledWith('job-123', 'org-123');
      expect(result).toEqual(mockApplications);
    });
  });

  describe('getByCandidate', () => {
    it('should get applications by candidate', async () => {
      const mockApplications = [
        { id: 'app-1', candidate_id: 'candidate-123', status: 'screening' },
        { id: 'app-2', candidate_id: 'candidate-123', status: 'rejected' }
      ];
      mockApplicationRepository.findByCandidate = jest.fn().mockResolvedValue(mockApplications);

      const result = await applicationService.getByCandidate('candidate-123', mockUser);

      expect(mockApplicationRepository.findByCandidate).toHaveBeenCalledWith('candidate-123', 'org-123');
      expect(result).toEqual(mockApplications);
    });
  });

  describe('changeStatus', () => {
    it('should change status with valid transition', async () => {
      const mockApplication = {
        id: 'app-123',
        status: 'applied',
        organization_id: 'org-123'
      };
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(mockApplication);

      const mockUpdatedApplication = {
        ...mockApplication,
        status: 'screening'
      };
      mockApplicationRepository.updateStatus = jest.fn().mockResolvedValue(mockUpdatedApplication);

      const result = await applicationService.changeStatus('app-123', 'screening', mockUser, 'Moving to next stage');

      expect(mockApplicationRepository.findById).toHaveBeenCalledWith('app-123', 'org-123');
      expect(mockApplicationRepository.updateStatus).toHaveBeenCalledWith(
        'app-123',
        'screening',
        'user-123',
        'Moving to next stage',
        'org-123'
      );
      expect(result).toEqual(mockUpdatedApplication);
    });

    it('should throw ValidationError for invalid status', async () => {
      const mockApplication = {
        id: 'app-123',
        status: 'applied',
        organization_id: 'org-123'
      };
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(mockApplication);

      await expect(
        applicationService.changeStatus('app-123', 'invalid-status', mockUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw BusinessRuleError for invalid status transition', async () => {
      const mockApplication = {
        id: 'app-123',
        status: 'rejected',
        organization_id: 'org-123'
      };
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(mockApplication);

      await expect(
        applicationService.changeStatus('app-123', 'screening', mockUser)
      ).rejects.toThrow(BusinessRuleError);
      await expect(
        applicationService.changeStatus('app-123', 'screening', mockUser)
      ).rejects.toThrow(/cannot change status/);
    });

    it('should throw NotFoundError when application does not exist', async () => {
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(applicationService.changeStatus('app-999', 'screening', mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getStatistics', () => {
    it('should get application statistics', async () => {
      const mockStats = [
        { status: 'applied', count: 10 },
        { status: 'screening', count: 5 },
        { status: 'interview', count: 3 },
        { status: 'hired', count: 2 }
      ];
      const mockPipelineStats = [
        { status: 'applied', count: 10, avg_days_in_status: 2 }
      ];
      
      mockApplicationRepository.getCountByStatus = jest.fn().mockResolvedValue(mockStats);
      mockApplicationRepository.getPipelineStats = jest.fn().mockResolvedValue(mockPipelineStats);

      const result = await applicationService.getStatistics(mockUser);

      expect(mockApplicationRepository.getCountByStatus).toHaveBeenCalledWith('org-123');
      expect(mockApplicationRepository.getPipelineStats).toHaveBeenCalledWith('org-123', null);
      expect(result).toEqual({
        byStatus: mockStats,
        total: 20,
        pipeline: mockPipelineStats
      });
    });

    it('should handle empty statistics', async () => {
      mockApplicationRepository.getCountByStatus = jest.fn().mockResolvedValue([]);
      mockApplicationRepository.getPipelineStats = jest.fn().mockResolvedValue([]);

      const result = await applicationService.getStatistics(mockUser);

      expect(result).toEqual({
        byStatus: [],
        total: 0,
        pipeline: []
      });
    });
  });

});
