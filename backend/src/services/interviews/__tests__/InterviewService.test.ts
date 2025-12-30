/**
 * InterviewService Unit Tests
 * Tests all business logic for interview management
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import { InterviewService } from '../InterviewService.ts';
import { ValidationError, BusinessRuleError, NotFoundError } from '../../../middleware/errorHandler.ts';

// Mock dependencies at top level
jest.mock('../../../config/database.ts');
jest.mock('../../../utils/logger.ts');
jest.mock('../../../repositories/InterviewRepository.ts');
jest.mock('../../../repositories/ApplicationRepository.ts');

describe('InterviewService', () => {
  let interviewService;
  let mockInterviewRepository;
  let mockApplicationRepository;
  let mockUser;
  let testIds;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Generate consistent test IDs
    testIds = {
      userId: uuidv4(),
      orgId: uuidv4(),
      applicationId: uuidv4(),
      interviewerId: uuidv4(),
      interviewId: uuidv4(),
      candidateId: uuidv4(),
      jobId: uuidv4()
    };
    
    // Dynamic imports after mocks are set up
    const { InterviewRepository } = await import('../../../repositories/InterviewRepository');
    const { ApplicationRepository } = await import('../../../repositories/ApplicationRepository');
    
    interviewService = new InterviewService();
    mockInterviewRepository = interviewService.interviewRepository;
    mockApplicationRepository = interviewService.applicationRepository;

    // Initialize all repository methods as jest.fn()
    mockInterviewRepository.create = jest.fn();
    mockInterviewRepository.findById = jest.fn();
    mockInterviewRepository.findByIdWithDetails = jest.fn();
    mockInterviewRepository.update = jest.fn();
    mockInterviewRepository.delete = jest.fn();
    mockInterviewRepository.search = jest.fn();
    mockInterviewRepository.count = jest.fn();
    mockInterviewRepository.checkSchedulingConflict = jest.fn();
    mockInterviewRepository.findByApplication = jest.fn();
    mockInterviewRepository.findByInterviewer = jest.fn();
    mockInterviewRepository.updateFeedback = jest.fn();
    mockInterviewRepository.getCountByStatus = jest.fn();
    mockInterviewRepository.getCountByType = jest.fn();
    
    mockApplicationRepository.findById = jest.fn();

    // Mock user for tests
    mockUser = {
      id: testIds.userId,
      organization_id: testIds.orgId,
      role: 'admin'
    };
  });

  const getValidInterviewData = (testIds) => ({
    application_id: testIds.applicationId,
    interviewer_id: testIds.interviewerId,
    scheduled_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    duration: 60,
    interview_type: 'technical',
    location: 'Conference Room A',
    meeting_link: 'https://zoom.us/j/123456789',
    notes: 'Please prepare coding questions',
    agenda: 'Technical assessment and system design'
  });

  describe('create', () => {
    it('should create an interview with valid data', async () => {
      const mockApplication = {
        id: testIds.applicationId,
        candidate_id: testIds.candidateId,
        job_id: testIds.jobId,
        status: 'interview',
        organization_id: testIds.orgId
      };
      mockApplicationRepository.findById.mockResolvedValue(mockApplication);

      mockInterviewRepository.checkSchedulingConflict.mockResolvedValue(null);

      const mockCreatedInterview = {
        id: testIds.interviewId,
        ...getValidInterviewData(testIds),
        status: 'scheduled',
        created_by: testIds.userId,
        organization_id: testIds.orgId
      };
      mockInterviewRepository.create.mockResolvedValue(mockCreatedInterview);

      const result = await interviewService.create(getValidInterviewData(testIds), mockUser);

      expect(mockApplicationRepository.findById).toHaveBeenCalledWith(testIds.applicationId, testIds.orgId);
      expect(mockInterviewRepository.checkSchedulingConflict).toHaveBeenCalledWith(
        testIds.interviewerId,
        expect.any(Date),
        60,
        testIds.orgId
      );
      expect(mockInterviewRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          application_id: testIds.applicationId,
          interviewer_id: testIds.interviewerId,
          scheduled_at: expect.any(Date),
          duration: 60,
          interview_type: 'technical',
          status: 'scheduled',
          created_by: testIds.userId
        }),
        testIds.orgId
      );
      expect(result).toEqual(mockCreatedInterview);
    });

    it('should throw ValidationError for invalid data', async () => {
      const invalidData = {
        application_id: 'not-a-uuid'
      };

      await expect(interviewService.create(invalidData, mockUser)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for scheduled_at in the past', async () => {
      const invalidData = {
        ...getValidInterviewData(testIds),
        scheduled_at: new Date(Date.now() - 86400000).toISOString() // Yesterday
      };

      await expect(interviewService.create(invalidData, mockUser)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when application does not exist', async () => {
      mockApplicationRepository.findById.mockResolvedValue(null);

      await expect(interviewService.create(getValidInterviewData(testIds), mockUser)).rejects.toThrow(NotFoundError);
    });

    it('should throw BusinessRuleError when scheduling for rejected application', async () => {
      const mockRejectedApplication = {
        id: testIds.applicationId,
        status: 'rejected',
        organization_id: testIds.orgId
      };
      mockApplicationRepository.findById.mockResolvedValue(mockRejectedApplication);

      await expect(interviewService.create(getValidInterviewData(testIds), mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(interviewService.create(getValidInterviewData(testIds), mockUser)).rejects.toThrow(/rejected/);
    });

    it('should throw BusinessRuleError when scheduling for hired application', async () => {
      const mockHiredApplication = {
        id: testIds.applicationId,
        status: 'hired',
        organization_id: testIds.orgId
      };
      mockApplicationRepository.findById.mockResolvedValue(mockHiredApplication);

      await expect(interviewService.create(getValidInterviewData(testIds), mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(interviewService.create(getValidInterviewData(testIds), mockUser)).rejects.toThrow(/hired/);
    });

    it('should throw BusinessRuleError when scheduling conflict exists', async () => {
      const mockApplication = {
        id: testIds.applicationId,
        status: 'interview',
        organization_id: testIds.orgId
      };
      mockApplicationRepository.findById.mockResolvedValue(mockApplication);

      const mockConflict = {
        id: 'conflict-123',
        scheduled_at: getValidInterviewData(testIds).scheduled_at,
        interviewer_id: testIds.interviewerId
      };
      mockInterviewRepository.checkSchedulingConflict.mockResolvedValue(mockConflict);

      await expect(interviewService.create(getValidInterviewData(testIds), mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(interviewService.create(getValidInterviewData(testIds), mockUser)).rejects.toThrow(/scheduling conflict/);
    });
  });

  describe('getById', () => {
    it('should get interview by id with details', async () => {
      const mockInterview = {
        id: testIds.interviewId,
        application_id: testIds.applicationId,
        interviewer_id: testIds.interviewerId,
        status: 'scheduled',
        organization_id: testIds.orgId,
        application: { candidate: { name: 'John Doe' } },
        interviewer: { name: 'Jane Smith' }
      };
      mockInterviewRepository.findByIdWithDetails.mockResolvedValue(mockInterview);

      const result = await interviewService.getById(testIds.interviewId, mockUser, true);

      expect(mockInterviewRepository.findByIdWithDetails).toHaveBeenCalledWith(testIds.interviewId, testIds.orgId);
      expect(result).toEqual(mockInterview);
    });

    it('should throw NotFoundError when interview does not exist', async () => {
      mockInterviewRepository.findByIdWithDetails.mockResolvedValue(null);

      await expect(interviewService.getById(uuidv4(), mockUser, true)).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    const updateData = {
      notes: 'Updated interview notes',
      location: 'Conference Room B'
    };

    it('should update interview with valid data', async () => {
      const mockExistingInterview = {
        id: testIds.interviewId,
        status: 'scheduled',
        organization_id: testIds.orgId
      };
      mockInterviewRepository.findById.mockResolvedValue(mockExistingInterview);

      const mockUpdatedInterview = {
        ...mockExistingInterview,
        ...updateData,
        updated_by: testIds.userId
      };
      mockInterviewRepository.update.mockResolvedValue(mockUpdatedInterview);

      const result = await interviewService.update(testIds.interviewId, updateData, mockUser);

      expect(mockInterviewRepository.findById).toHaveBeenCalledWith(testIds.interviewId, testIds.orgId);
      expect(mockInterviewRepository.update).toHaveBeenCalledWith(
        testIds.interviewId,
        expect.objectContaining({
          ...updateData,
          updated_by: testIds.userId
        }),
        testIds.orgId
      );
      expect(result).toEqual(mockUpdatedInterview);
    });

    it('should throw ValidationError for invalid update data', async () => {
      const invalidData = {
        interview_type: 'invalid-type'
      };

      await expect(interviewService.update(testIds.interviewId, invalidData, mockUser)).rejects.toThrow(ValidationError);
    });

    it('should throw BusinessRuleError when updating completed interview', async () => {
      const mockCompletedInterview = {
        id: testIds.interviewId,
        status: 'completed',
        organization_id: testIds.orgId
      };
      mockInterviewRepository.findById.mockResolvedValue(mockCompletedInterview);

      await expect(interviewService.update(testIds.interviewId, updateData, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(interviewService.update(testIds.interviewId, updateData, mockUser)).rejects.toThrow(/completed/);
    });

    it('should check scheduling conflict when updating schedule', async () => {
      const mockExistingInterview = {
        id: testIds.interviewId,
        status: 'scheduled',
        interviewer_id: testIds.interviewerId,
        organization_id: testIds.orgId
      };
      mockInterviewRepository.findById.mockResolvedValue(mockExistingInterview);

      const scheduleUpdate = {
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        duration: 90
      };

      mockInterviewRepository.checkSchedulingConflict.mockResolvedValue(null);
      mockInterviewRepository.update.mockResolvedValue({ ...mockExistingInterview, ...scheduleUpdate });

      await interviewService.update(testIds.interviewId, scheduleUpdate, mockUser);

      expect(mockInterviewRepository.checkSchedulingConflict).toHaveBeenCalledWith(
        testIds.interviewerId,
        expect.any(Date),
        90,
        testIds.orgId,
        testIds.interviewId
      );
    });

    it('should throw NotFoundError when interview does not exist', async () => {
      mockInterviewRepository.findById.mockResolvedValue(null);

      await expect(interviewService.update(uuidv4(), updateData, mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete scheduled interview', async () => {
      const mockInterview = {
        id: testIds.interviewId,
        status: 'scheduled',
        organization_id: testIds.orgId
      };
      mockInterviewRepository.findById.mockResolvedValue(mockInterview);
      mockInterviewRepository.delete.mockResolvedValue(true);

      await interviewService.delete(testIds.interviewId, mockUser);

      expect(mockInterviewRepository.findById).toHaveBeenCalledWith(testIds.interviewId, testIds.orgId);
      expect(mockInterviewRepository.delete).toHaveBeenCalledWith(testIds.interviewId, testIds.orgId);
    });

    it('should throw BusinessRuleError when deleting completed interview', async () => {
      const mockCompletedInterview = {
        id: testIds.interviewId,
        status: 'completed',
        organization_id: testIds.orgId
      };
      mockInterviewRepository.findById.mockResolvedValue(mockCompletedInterview);

      await expect(interviewService.delete(testIds.interviewId, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(interviewService.delete(testIds.interviewId, mockUser)).rejects.toThrow(/completed/);
      expect(mockInterviewRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when interview does not exist', async () => {
      mockInterviewRepository.findById.mockResolvedValue(null);

      await expect(interviewService.delete(uuidv4(), mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('search', () => {
    it('should search interviews with filters', async () => {
      const filters = {
        status: 'scheduled',
        interview_type: 'technical',
        interviewer_id: testIds.interviewerId,
        page: 1,
        limit: 20
      };

      const mockSearchResult = {
        interviews: [
          { id: 'interview-1', status: 'scheduled' },
          { id: 'interview-2', status: 'scheduled' }
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      };
      mockInterviewRepository.search = jest.fn().mockResolvedValue(mockSearchResult);

      const result = await interviewService.search(filters, mockUser);

      expect(mockInterviewRepository.search).toHaveBeenCalledWith(filters, testIds.orgId);
      expect(result).toEqual(mockSearchResult);
    });

    it('should handle empty search results', async () => {
      const filters = { page: 1, limit: 20 };
      const mockEmptyResult = {
        interviews: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      };
      mockInterviewRepository.search = jest.fn().mockResolvedValue(mockEmptyResult);

      const result = await interviewService.search(filters, mockUser);

      expect(result.interviews).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getByApplication', () => {
    it('should get interviews by application', async () => {
      const mockApplication = {
        id: testIds.applicationId,
        organization_id: testIds.orgId
      };
      mockApplicationRepository.findById.mockResolvedValue(mockApplication);
      
      const mockInterviews = [
        { id: 'interview-1', application_id: testIds.applicationId, status: 'completed' },
        { id: 'interview-2', application_id: testIds.applicationId, status: 'scheduled' }
      ];
      mockInterviewRepository.findByApplication.mockResolvedValue(mockInterviews);

      const result = await interviewService.getByApplication(testIds.applicationId, mockUser);

      expect(mockApplicationRepository.findById).toHaveBeenCalledWith(testIds.applicationId, testIds.orgId);
      expect(mockInterviewRepository.findByApplication).toHaveBeenCalledWith(testIds.applicationId, testIds.orgId);
      expect(result).toHaveLength(2);
    });
  });

  describe('getByInterviewer', () => {
    it('should get interviews by interviewer', async () => {
      const mockResult = {
        interviews: [
          { id: 'interview-1', interviewer_id: testIds.interviewerId, status: 'scheduled' },
          { id: 'interview-2', interviewer_id: testIds.interviewerId, status: 'completed' }
        ],
        total: 2
      };
      mockInterviewRepository.findByInterviewer.mockResolvedValue(mockResult);

      const result = await interviewService.getByInterviewer(testIds.interviewerId, mockUser);

      expect(mockInterviewRepository.findByInterviewer).toHaveBeenCalledWith(testIds.interviewerId, testIds.orgId, {});
      expect(result.interviews).toHaveLength(2);
    });
  });

  describe('submitFeedback', () => {
    const feedbackData = {
      feedback: 'Candidate showed excellent problem-solving skills',
      rating: 4,
      decision: 'proceed'
    };

    it('should submit feedback for completed interview', async () => {
      const mockInterview = {
        id: testIds.interviewId,
        status: 'completed',
        organization_id: testIds.orgId
      };
      mockInterviewRepository.findById.mockResolvedValue(mockInterview);

      const mockUpdatedInterview = {
        ...mockInterview,
        ...feedbackData,
        feedback_submitted_at: new Date()
      };
      mockInterviewRepository.updateFeedback.mockResolvedValue(mockUpdatedInterview);

      const result = await interviewService.submitFeedback(testIds.interviewId, feedbackData, mockUser);

      expect(mockInterviewRepository.findById).toHaveBeenCalledWith(testIds.interviewId, testIds.orgId);
      expect(mockInterviewRepository.updateFeedback).toHaveBeenCalledWith(
        testIds.interviewId,
        feedbackData.feedback,
        feedbackData.rating,
        feedbackData.decision,
        testIds.orgId
      );
      expect(result).toEqual(mockUpdatedInterview);
    });

    it('should throw ValidationError for invalid feedback', async () => {
      const invalidFeedback = {
        feedback: 'Good',
        rating: 10, // Invalid rating
        decision: 'proceed'
      };

      await expect(interviewService.submitFeedback(testIds.interviewId, invalidFeedback, mockUser)).rejects.toThrow(ValidationError);
    });

    it('should throw BusinessRuleError when submitting feedback for non-completed interview', async () => {
      const mockScheduledInterview = {
        id: testIds.interviewId,
        status: 'scheduled',
        organization_id: testIds.orgId
      };
      mockInterviewRepository.findById.mockResolvedValue(mockScheduledInterview);

      await expect(interviewService.submitFeedback(testIds.interviewId, feedbackData, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(interviewService.submitFeedback(testIds.interviewId, feedbackData, mockUser)).rejects.toThrow(/completed/);
    });

    it('should throw NotFoundError when interview does not exist', async () => {
      mockInterviewRepository.findById.mockResolvedValue(null);

      await expect(interviewService.submitFeedback(uuidv4(), feedbackData, mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('cancel', () => {
    it('should cancel scheduled interview', async () => {
      const mockInterview = {
        id: testIds.interviewId,
        status: 'scheduled',
        organization_id: testIds.orgId
      };
      mockInterviewRepository.findById.mockResolvedValue(mockInterview);

      const mockCancelledInterview = {
        ...mockInterview,
        status: 'cancelled',
        cancelled_at: new Date(),
        cancelled_by: testIds.userId,
        cancellation_reason: 'Candidate unavailable'
      };
      mockInterviewRepository.update.mockResolvedValue(mockCancelledInterview);

      const result = await interviewService.cancel(testIds.interviewId, mockUser, 'Candidate unavailable');

      expect(mockInterviewRepository.findById).toHaveBeenCalledWith(testIds.interviewId, testIds.orgId);
      expect(mockInterviewRepository.update).toHaveBeenCalledWith(
        testIds.interviewId,
        expect.objectContaining({
          status: 'cancelled',
          notes: 'Cancelled: Candidate unavailable',
          updated_by: testIds.userId
        }),
        testIds.orgId
      );
      expect(result).toEqual(mockCancelledInterview);
    });

    it('should throw BusinessRuleError when cancelling completed interview', async () => {
      const mockCompletedInterview = {
        id: testIds.interviewId,
        status: 'completed',
        organization_id: testIds.orgId
      };
      mockInterviewRepository.findById.mockResolvedValue(mockCompletedInterview);

      await expect(interviewService.cancel(testIds.interviewId, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(interviewService.cancel(testIds.interviewId, mockUser)).rejects.toThrow(/completed/);
    });

    it('should throw NotFoundError when interview does not exist', async () => {
      mockInterviewRepository.findById.mockResolvedValue(null);

      await expect(interviewService.cancel(uuidv4(), mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('complete', () => {
    it('should complete scheduled interview', async () => {
      const mockInterview = {
        id: testIds.interviewId,
        status: 'scheduled',
        organization_id: testIds.orgId
      };
      mockInterviewRepository.findById.mockResolvedValue(mockInterview);

      const mockCompletedInterview = {
        ...mockInterview,
        status: 'completed',
        completed_at: new Date(),
        updated_by: testIds.userId
      };
      mockInterviewRepository.update.mockResolvedValue(mockCompletedInterview);

      const result = await interviewService.complete(testIds.interviewId, mockUser);

      expect(mockInterviewRepository.findById).toHaveBeenCalledWith(testIds.interviewId, testIds.orgId);
      expect(mockInterviewRepository.update).toHaveBeenCalledWith(
        testIds.interviewId,
        expect.objectContaining({
          status: 'completed',
          completed_at: expect.any(Date),
          updated_by: testIds.userId
        }),
        testIds.orgId
      );
      expect(result).toMatchObject({
        id: testIds.interviewId,
        status: 'completed',
        organization_id: testIds.orgId
      });
    });

    it('should throw BusinessRuleError when completing already completed interview', async () => {
      const mockCompletedInterview = {
        id: testIds.interviewId,
        status: 'completed',
        organization_id: testIds.orgId
      };
      mockInterviewRepository.findById.mockResolvedValue(mockCompletedInterview);

      await expect(interviewService.complete(testIds.interviewId, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(interviewService.complete(testIds.interviewId, mockUser)).rejects.toThrow(/Cannot complete interview/);
    });

    it('should throw NotFoundError when interview does not exist', async () => {
      mockInterviewRepository.findById.mockResolvedValue(null);

      await expect(interviewService.complete(uuidv4(), mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getStatistics', () => {
    it('should get interview statistics', async () => {
      const mockStatusStats = [
        { status: 'scheduled', count: 5 },
        { status: 'completed', count: 10 },
        { status: 'cancelled', count: 2 }
      ];
      const mockTypeStats = [
        { type: 'technical', count: 8 },
        { type: 'behavioral', count: 5 }
      ];
      mockInterviewRepository.getCountByStatus.mockResolvedValue(mockStatusStats);
      mockInterviewRepository.getCountByType.mockResolvedValue(mockTypeStats);

      const result = await interviewService.getStatistics(mockUser);

      expect(mockInterviewRepository.getCountByStatus).toHaveBeenCalledWith(testIds.orgId);
      expect(mockInterviewRepository.getCountByType).toHaveBeenCalledWith(testIds.orgId);
      expect(result).toEqual({
        byStatus: mockStatusStats,
        byType: mockTypeStats,
        total: 17
      });
    });

    it('should handle empty statistics', async () => {
      mockInterviewRepository.getCountByStatus.mockResolvedValue([]);
      mockInterviewRepository.getCountByType.mockResolvedValue([]);

      const result = await interviewService.getStatistics(mockUser);

      expect(result).toEqual({
        byStatus: [],
        byType: [],
        total: 0
      });
    });
  });
});
