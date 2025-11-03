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

  let testIds;
  let validApplicationData;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Generate fresh UUIDs for each test
    const { v4: uuidv4 } = await import('uuid');
    testIds = {
      userId: uuidv4(),
      orgId: uuidv4(),
      applicationId: uuidv4(),
      candidateId: uuidv4(),
      jobId: uuidv4(),
      reviewerId: uuidv4()
    };
    
    // Dynamic imports after mocks are set up
    const { ApplicationRepository } = await import('../../../repositories/ApplicationRepository.js');
    const { JobRepository } = await import('../../../repositories/JobRepository.js');
    const { CandidateRepository } = await import('../../../repositories/CandidateRepository.js');
    mockOrganization = (await import('../../../models/Organization.js')).default;
    
    applicationService = new ApplicationService();
    mockApplicationRepository = applicationService.applicationRepository;
    mockJobRepository = applicationService.jobRepository;
    mockCandidateRepository = applicationService.candidateRepository;

    // Initialize all repository methods as jest.fn()
    mockApplicationRepository.create = jest.fn();
    mockApplicationRepository.findById = jest.fn();
    mockApplicationRepository.findByIdWithDetails = jest.fn();
    mockApplicationRepository.update = jest.fn();
    mockApplicationRepository.delete = jest.fn();
    mockApplicationRepository.search = jest.fn();
    mockApplicationRepository.count = jest.fn();
    mockApplicationRepository.findByCandidateAndJob = jest.fn();
    mockApplicationRepository.findByJob = jest.fn();
    mockApplicationRepository.findByCandidate = jest.fn();
    mockApplicationRepository.updateStatus = jest.fn();
    mockApplicationRepository.getStatistics = jest.fn();
    
    mockJobRepository.findById = jest.fn();
    mockCandidateRepository.findById = jest.fn();

    // Mock user for tests
    mockUser = {
      id: testIds.userId,
      organization_id: testIds.orgId,
      role: 'admin'
    };
    
    // Define validApplicationData after testIds are generated
    validApplicationData = {
      candidate_id: testIds.candidateId,
      job_id: testIds.jobId,
      cover_letter: 'I am very interested in this position...',
      source: 'website',
      referrer_name: null,
      answers: { question1: 'answer1' },
      metadata: {}
    };
  });

  describe('create', () => {
    it('should create an application with valid data', async () => {
      const mockJob = {
        id: testIds.jobId,
        title: 'Software Engineer',
        status: 'open',
        is_published: true,
        organization_id: testIds.orgId
      };
      mockJobRepository.findById.mockResolvedValue(mockJob);

      const mockCandidate = {
        id: testIds.candidateId,
        name: 'John Doe',
        organization_id: testIds.orgId
      };
      mockCandidateRepository.findById.mockResolvedValue(mockCandidate);

      mockApplicationRepository.findByCandidateAndJob.mockResolvedValue(null);

      const mockCreatedApplication = {
        id: testIds.applicationId,
        ...validApplicationData,
        status: 'applied',
        applied_at: new Date(),
        created_by: testIds.userId,
        organization_id: testIds.orgId
      };
      mockApplicationRepository.create.mockResolvedValue(mockCreatedApplication);

      const result = await applicationService.create(validApplicationData, mockUser);

      expect(mockJobRepository.findById).toHaveBeenCalledWith(testIds.jobId, testIds.orgId);
      expect(mockCandidateRepository.findById).toHaveBeenCalledWith(testIds.candidateId, testIds.orgId);
      expect(mockApplicationRepository.findByCandidateAndJob).toHaveBeenCalledWith(
        testIds.candidateId,
        testIds.jobId,
        testIds.orgId
      );
      expect(mockApplicationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validApplicationData,
          status: 'applied',
          applied_at: expect.any(Date),
          created_by: testIds.userId
        }),
        testIds.orgId
      );
      expect(result).toMatchObject({
        id: testIds.applicationId,
        candidate_id: testIds.candidateId,
        job_id: testIds.jobId,
        status: 'applied',
        created_by: testIds.userId,
        organization_id: testIds.orgId
      });
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
        id: testIds.jobId,
        status: 'closed',
        is_published: true,
        organization_id: testIds.orgId
      };
      mockJobRepository.findById = jest.fn().mockResolvedValue(mockClosedJob);

      await expect(applicationService.create(validApplicationData, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(applicationService.create(validApplicationData, mockUser)).rejects.toThrow(/closed job/);
    });

    it('should throw BusinessRuleError when applying to unpublished job', async () => {
      const mockUnpublishedJob = {
        id: testIds.jobId,
        status: 'open',
        is_published: false,
        organization_id: testIds.orgId
      };
      mockJobRepository.findById = jest.fn().mockResolvedValue(mockUnpublishedJob);

      await expect(applicationService.create(validApplicationData, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(applicationService.create(validApplicationData, mockUser)).rejects.toThrow(/unpublished job/);
    });

    it('should throw NotFoundError when candidate does not exist', async () => {
      const mockJob = {
        id: testIds.jobId,
        status: 'open',
        is_published: true,
        organization_id: testIds.orgId
      };
      mockJobRepository.findById = jest.fn().mockResolvedValue(mockJob);
      mockCandidateRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(applicationService.create(validApplicationData, mockUser)).rejects.toThrow(NotFoundError);
    });

    it('should throw BusinessRuleError for duplicate application', async () => {
      const mockJob = {
        id: testIds.jobId,
        status: 'open',
        is_published: true,
        organization_id: testIds.orgId
      };
      mockJobRepository.findById = jest.fn().mockResolvedValue(mockJob);

      const mockCandidate = {
        id: testIds.candidateId,
        organization_id: testIds.orgId
      };
      mockCandidateRepository.findById = jest.fn().mockResolvedValue(mockCandidate);

      const mockExistingApplication = {
        id: 'existing-app-123',
        candidate_id: testIds.candidateId,
        job_id: testIds.jobId
      };
      mockApplicationRepository.findByCandidateAndJob = jest.fn().mockResolvedValue(mockExistingApplication);

      await expect(applicationService.create(validApplicationData, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(applicationService.create(validApplicationData, mockUser)).rejects.toThrow(/already applied/);
    });
  });

  describe('getById', () => {
    it('should get application by id with details', async () => {
      const mockApplication = {
        id: testIds.applicationId,
        candidate_id: testIds.candidateId,
        job_id: testIds.jobId,
        status: 'screening',
        organization_id: testIds.orgId,
        candidate: { name: 'John Doe' },
        job: { title: 'Software Engineer' }
      };
      mockApplicationRepository.findByIdWithDetails.mockResolvedValue(mockApplication);

      const result = await applicationService.getById(testIds.applicationId, mockUser, true);

      expect(mockApplicationRepository.findByIdWithDetails).toHaveBeenCalledWith(testIds.applicationId, testIds.orgId);
      expect(result).toMatchObject({
        id: testIds.applicationId,
        candidate_id: testIds.candidateId,
        job_id: testIds.jobId,
        status: 'screening',
        organization_id: testIds.orgId
      });
    });

    it('should throw NotFoundError when application does not exist', async () => {
      mockApplicationRepository.findByIdWithDetails.mockResolvedValue(null);

      await expect(applicationService.getById('app-999', mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('should update application with valid data', async () => {
      const updateData = {
        notes: 'Candidate looks promising',
        reviewed_by: testIds.userId
      };
      
      const mockExistingApplication = {
        id: testIds.applicationId,
        status: 'screening',
        organization_id: testIds.orgId
      };
      mockApplicationRepository.findById.mockResolvedValue(mockExistingApplication);

      const mockUpdatedApplication = {
        ...mockExistingApplication,
        ...updateData,
        updated_by: testIds.userId
      };
      mockApplicationRepository.update = jest.fn().mockResolvedValue(mockUpdatedApplication);

      const result = await applicationService.update(testIds.applicationId, updateData, mockUser);

      expect(mockApplicationRepository.findById).toHaveBeenCalledWith(testIds.applicationId, testIds.orgId);
      expect(mockApplicationRepository.update).toHaveBeenCalledWith(
        testIds.applicationId,
        expect.objectContaining({
          ...updateData,
          updated_by: testIds.userId
        }),
        testIds.orgId
      );
      expect(result).toEqual(mockUpdatedApplication);
    });

    it('should throw ValidationError for invalid update data', async () => {
      const invalidData = {
        status: 'invalid-status'
      };

      await expect(applicationService.update(testIds.applicationId, invalidData, mockUser)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when application does not exist', async () => {
      const updateData = {
        notes: 'Candidate looks promising',
        reviewed_by: testIds.userId
      };
      
      mockApplicationRepository.findById.mockResolvedValue(null);

      await expect(applicationService.update('app-999', updateData, mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete application that is not hired', async () => {
      const mockApplication = {
        id: testIds.applicationId,
        status: 'screening',
        organization_id: testIds.orgId
      };
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(mockApplication);
      mockApplicationRepository.delete = jest.fn().mockResolvedValue(true);

      await applicationService.delete(testIds.applicationId, mockUser);

      expect(mockApplicationRepository.findById).toHaveBeenCalledWith(testIds.applicationId, testIds.orgId);
      expect(mockApplicationRepository.delete).toHaveBeenCalledWith(testIds.applicationId, testIds.orgId);
    });

    it('should throw BusinessRuleError when deleting hired application', async () => {
      const mockHiredApplication = {
        id: testIds.applicationId,
        status: 'hired',
        organization_id: testIds.orgId
      };
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(mockHiredApplication);

      await expect(applicationService.delete(testIds.applicationId, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(applicationService.delete(testIds.applicationId, mockUser)).rejects.toThrow(/hired/);
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
        job_id: testIds.jobId,
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

      expect(mockApplicationRepository.search).toHaveBeenCalledWith(filters, testIds.orgId);
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
      const mockJob = {
        id: testIds.jobId,
        title: 'Software Engineer',
        organization_id: testIds.orgId
      };
      mockJobRepository.findById.mockResolvedValue(mockJob);
      
      const mockResult = {
        applications: [
          { id: 'app-1', job_id: testIds.jobId, status: 'screening' },
          { id: 'app-2', job_id: testIds.jobId, status: 'interview' }
        ],
        total: 2
      };
      mockApplicationRepository.findByJob.mockResolvedValue(mockResult);

      const result = await applicationService.getByJob(testIds.jobId, mockUser);

      expect(mockJobRepository.findById).toHaveBeenCalledWith(testIds.jobId, testIds.orgId);
      expect(mockApplicationRepository.findByJob).toHaveBeenCalledWith(testIds.jobId, testIds.orgId, {});
      expect(result.applications).toHaveLength(2);
    });
  });

  describe('getByCandidate', () => {
    it('should get applications by candidate', async () => {
      const mockCandidate = {
        id: testIds.candidateId,
        name: 'John Doe',
        organization_id: testIds.orgId
      };
      mockCandidateRepository.findById.mockResolvedValue(mockCandidate);
      
      const mockApplications = [
        { id: 'app-1', candidate_id: testIds.candidateId, status: 'screening' },
        { id: 'app-2', candidate_id: testIds.candidateId, status: 'rejected' }
      ];
      mockApplicationRepository.findByCandidate.mockResolvedValue(mockApplications);

      const result = await applicationService.getByCandidate(testIds.candidateId, mockUser);

      expect(mockCandidateRepository.findById).toHaveBeenCalledWith(testIds.candidateId, testIds.orgId);
      expect(mockApplicationRepository.findByCandidate).toHaveBeenCalledWith(testIds.candidateId, testIds.orgId);
      expect(result).toEqual(mockApplications);
    });
  });

  describe('changeStatus', () => {
    it('should change status with valid transition', async () => {
      const mockApplication = {
        id: testIds.applicationId,
        status: 'applied',
        organization_id: testIds.orgId
      };
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(mockApplication);

      const mockUpdatedApplication = {
        ...mockApplication,
        status: 'screening'
      };
      mockApplicationRepository.updateStatus = jest.fn().mockResolvedValue(mockUpdatedApplication);

      const result = await applicationService.changeStatus(testIds.applicationId, 'screening', mockUser, 'Moving to next stage');

      expect(mockApplicationRepository.findById).toHaveBeenCalledWith(testIds.applicationId, testIds.orgId);
      expect(mockApplicationRepository.updateStatus).toHaveBeenCalledWith(
        testIds.applicationId,
        'screening',
        testIds.userId,
        'Moving to next stage',
        testIds.orgId
      );
      expect(result).toEqual(mockUpdatedApplication);
    });

    it('should throw ValidationError for invalid status', async () => {
      const mockApplication = {
        id: testIds.applicationId,
        status: 'applied',
        organization_id: testIds.orgId
      };
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(mockApplication);

      await expect(
        applicationService.changeStatus(testIds.applicationId, 'invalid-status', mockUser)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw BusinessRuleError for invalid status transition', async () => {
      const mockApplication = {
        id: testIds.applicationId,
        status: 'rejected',
        organization_id: testIds.orgId
      };
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(mockApplication);

      await expect(
        applicationService.changeStatus(testIds.applicationId, 'screening', mockUser)
      ).rejects.toThrow(BusinessRuleError);
      await expect(
        applicationService.changeStatus(testIds.applicationId, 'screening', mockUser)
      ).rejects.toThrow(/Cannot change application status/);
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

      expect(mockApplicationRepository.getCountByStatus).toHaveBeenCalledWith(testIds.orgId);
      expect(mockApplicationRepository.getPipelineStats).toHaveBeenCalledWith(testIds.orgId, null);
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
