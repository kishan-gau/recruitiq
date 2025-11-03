/**
 * InterviewService Unit Tests
 * Tests all business logic for interview management
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { InterviewService } from '../InterviewService.js';
import { ValidationError, BusinessRuleError, NotFoundError } from '../../../middleware/errorHandler.js';

// Mock dependencies at top level
jest.mock('../../../config/database.js');
jest.mock('../../../utils/logger.js');
jest.mock('../../../repositories/InterviewRepository.js');
jest.mock('../../../repositories/ApplicationRepository.js');

describe('InterviewService', () => {
  let interviewService;
  let mockInterviewRepository;
  let mockApplicationRepository;
  let mockUser;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Dynamic imports after mocks are set up
    const { InterviewRepository } = await import('../../../repositories/InterviewRepository.js');
    const { ApplicationRepository } = await import('../../../repositories/ApplicationRepository.js');
    
    interviewService = new InterviewService();
    mockInterviewRepository = interviewService.interviewRepository;
    mockApplicationRepository = interviewService.applicationRepository;

    // Mock user for tests
    mockUser = {
      id: 'user-123',
      organization_id: 'org-123',
      role: 'admin'
    };
  });

  const validInterviewData = {
    application_id: 'app-123',
    interviewer_id: 'interviewer-123',
    scheduled_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    duration: 60,
    interview_type: 'technical',
    location: 'Conference Room A',
    meeting_link: 'https://zoom.us/j/123456789',
    notes: 'Please prepare coding questions',
    agenda: 'Technical assessment and system design'
  };

  describe('create', () => {
    it('should create an interview with valid data', async () => {
      const mockApplication = {
        id: 'app-123',
        candidate_id: 'candidate-123',
        job_id: 'job-123',
        status: 'interview',
        organization_id: 'org-123'
      };
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(mockApplication);

      mockInterviewRepository.checkSchedulingConflict = jest.fn().mockResolvedValue(null);

      const mockCreatedInterview = {
        id: 'interview-123',
        ...validInterviewData,
        status: 'scheduled',
        created_by: 'user-123',
        organization_id: 'org-123'
      };
      mockInterviewRepository.create = jest.fn().mockResolvedValue(mockCreatedInterview);

      const result = await interviewService.create(validInterviewData, mockUser);

      expect(mockApplicationRepository.findById).toHaveBeenCalledWith('app-123', 'org-123');
      expect(mockInterviewRepository.checkSchedulingConflict).toHaveBeenCalledWith(
        'interviewer-123',
        expect.any(String),
        60,
        'org-123'
      );
      expect(mockInterviewRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validInterviewData,
          status: 'scheduled',
          created_by: 'user-123'
        }),
        'org-123'
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
        ...validInterviewData,
        scheduled_at: new Date(Date.now() - 86400000).toISOString() // Yesterday
      };

      await expect(interviewService.create(invalidData, mockUser)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when application does not exist', async () => {
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(interviewService.create(validInterviewData, mockUser)).rejects.toThrow(NotFoundError);
    });

    it('should throw BusinessRuleError when scheduling for rejected application', async () => {
      const mockRejectedApplication = {
        id: 'app-123',
        status: 'rejected',
        organization_id: 'org-123'
      };
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(mockRejectedApplication);

      await expect(interviewService.create(validInterviewData, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(interviewService.create(validInterviewData, mockUser)).rejects.toThrow(/rejected/);
    });

    it('should throw BusinessRuleError when scheduling for hired application', async () => {
      const mockHiredApplication = {
        id: 'app-123',
        status: 'hired',
        organization_id: 'org-123'
      };
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(mockHiredApplication);

      await expect(interviewService.create(validInterviewData, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(interviewService.create(validInterviewData, mockUser)).rejects.toThrow(/hired/);
    });

    it('should throw BusinessRuleError when scheduling conflict exists', async () => {
      const mockApplication = {
        id: 'app-123',
        status: 'interview',
        organization_id: 'org-123'
      };
      mockApplicationRepository.findById = jest.fn().mockResolvedValue(mockApplication);

      const mockConflict = {
        id: 'conflict-123',
        scheduled_at: validInterviewData.scheduled_at,
        interviewer_id: 'interviewer-123'
      };
      mockInterviewRepository.checkSchedulingConflict = jest.fn().mockResolvedValue(mockConflict);

      await expect(interviewService.create(validInterviewData, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(interviewService.create(validInterviewData, mockUser)).rejects.toThrow(/scheduling conflict/);
    });
  });

  describe('getById', () => {
    it('should get interview by id with details', async () => {
      const mockInterview = {
        id: 'interview-123',
        application_id: 'app-123',
        interviewer_id: 'interviewer-123',
        status: 'scheduled',
        organization_id: 'org-123',
        application: { candidate: { name: 'John Doe' } },
        interviewer: { name: 'Jane Smith' }
      };
      mockInterviewRepository.findByIdWithDetails = jest.fn().mockResolvedValue(mockInterview);

      const result = await interviewService.getById('interview-123', mockUser);

      expect(mockInterviewRepository.findByIdWithDetails).toHaveBeenCalledWith('interview-123', 'org-123');
      expect(result).toEqual(mockInterview);
    });

    it('should throw NotFoundError when interview does not exist', async () => {
      mockInterviewRepository.findByIdWithDetails = jest.fn().mockResolvedValue(null);

      await expect(interviewService.getById('interview-999', mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    const updateData = {
      notes: 'Updated interview notes',
      location: 'Conference Room B'
    };

    it('should update interview with valid data', async () => {
      const mockExistingInterview = {
        id: 'interview-123',
        status: 'scheduled',
        organization_id: 'org-123'
      };
      mockInterviewRepository.findById = jest.fn().mockResolvedValue(mockExistingInterview);

      const mockUpdatedInterview = {
        ...mockExistingInterview,
        ...updateData,
        updated_by: 'user-123'
      };
      mockInterviewRepository.update = jest.fn().mockResolvedValue(mockUpdatedInterview);

      const result = await interviewService.update('interview-123', updateData, mockUser);

      expect(mockInterviewRepository.findById).toHaveBeenCalledWith('interview-123', 'org-123');
      expect(mockInterviewRepository.update).toHaveBeenCalledWith(
        'interview-123',
        expect.objectContaining({
          ...updateData,
          updated_by: 'user-123'
        }),
        'org-123'
      );
      expect(result).toEqual(mockUpdatedInterview);
    });

    it('should throw ValidationError for invalid update data', async () => {
      const invalidData = {
        interview_type: 'invalid-type'
      };

      await expect(interviewService.update('interview-123', invalidData, mockUser)).rejects.toThrow(ValidationError);
    });

    it('should throw BusinessRuleError when updating completed interview', async () => {
      const mockCompletedInterview = {
        id: 'interview-123',
        status: 'completed',
        organization_id: 'org-123'
      };
      mockInterviewRepository.findById = jest.fn().mockResolvedValue(mockCompletedInterview);

      await expect(interviewService.update('interview-123', updateData, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(interviewService.update('interview-123', updateData, mockUser)).rejects.toThrow(/completed/);
    });

    it('should check scheduling conflict when updating schedule', async () => {
      const mockExistingInterview = {
        id: 'interview-123',
        status: 'scheduled',
        interviewer_id: 'interviewer-123',
        organization_id: 'org-123'
      };
      mockInterviewRepository.findById = jest.fn().mockResolvedValue(mockExistingInterview);

      const scheduleUpdate = {
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
        duration: 90
      };

      mockInterviewRepository.checkSchedulingConflict = jest.fn().mockResolvedValue(null);
      mockInterviewRepository.update = jest.fn().mockResolvedValue({ ...mockExistingInterview, ...scheduleUpdate });

      await interviewService.update('interview-123', scheduleUpdate, mockUser);

      expect(mockInterviewRepository.checkSchedulingConflict).toHaveBeenCalledWith(
        'interviewer-123',
        expect.any(String),
        90,
        'org-123',
        'interview-123'
      );
    });

    it('should throw NotFoundError when interview does not exist', async () => {
      mockInterviewRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(interviewService.update('interview-999', updateData, mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete scheduled interview', async () => {
      const mockInterview = {
        id: 'interview-123',
        status: 'scheduled',
        organization_id: 'org-123'
      };
      mockInterviewRepository.findById = jest.fn().mockResolvedValue(mockInterview);
      mockInterviewRepository.delete = jest.fn().mockResolvedValue(true);

      await interviewService.delete('interview-123', mockUser);

      expect(mockInterviewRepository.findById).toHaveBeenCalledWith('interview-123', 'org-123');
      expect(mockInterviewRepository.delete).toHaveBeenCalledWith('interview-123', 'org-123');
    });

    it('should throw BusinessRuleError when deleting completed interview', async () => {
      const mockCompletedInterview = {
        id: 'interview-123',
        status: 'completed',
        organization_id: 'org-123'
      };
      mockInterviewRepository.findById = jest.fn().mockResolvedValue(mockCompletedInterview);

      await expect(interviewService.delete('interview-123', mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(interviewService.delete('interview-123', mockUser)).rejects.toThrow(/completed/);
      expect(mockInterviewRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when interview does not exist', async () => {
      mockInterviewRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(interviewService.delete('interview-999', mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('search', () => {
    it('should search interviews with filters', async () => {
      const filters = {
        status: 'scheduled',
        interview_type: 'technical',
        interviewer_id: 'interviewer-123',
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

      expect(mockInterviewRepository.search).toHaveBeenCalledWith(filters, 'org-123');
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
      const mockInterviews = [
        { id: 'interview-1', application_id: 'app-123', status: 'completed' },
        { id: 'interview-2', application_id: 'app-123', status: 'scheduled' }
      ];
      mockInterviewRepository.findByApplication = jest.fn().mockResolvedValue(mockInterviews);

      const result = await interviewService.getByApplication('app-123', mockUser);

      expect(mockInterviewRepository.findByApplication).toHaveBeenCalledWith('app-123', 'org-123');
      expect(result).toEqual(mockInterviews);
    });
  });

  describe('getByInterviewer', () => {
    it('should get interviews by interviewer', async () => {
      const mockInterviews = [
        { id: 'interview-1', interviewer_id: 'interviewer-123', status: 'scheduled' },
        { id: 'interview-2', interviewer_id: 'interviewer-123', status: 'completed' }
      ];
      mockInterviewRepository.findByInterviewer = jest.fn().mockResolvedValue(mockInterviews);

      const result = await interviewService.getByInterviewer('interviewer-123', mockUser);

      expect(mockInterviewRepository.findByInterviewer).toHaveBeenCalledWith('interviewer-123', 'org-123');
      expect(result).toEqual(mockInterviews);
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
        id: 'interview-123',
        status: 'completed',
        organization_id: 'org-123'
      };
      mockInterviewRepository.findById = jest.fn().mockResolvedValue(mockInterview);

      const mockUpdatedInterview = {
        ...mockInterview,
        ...feedbackData,
        feedback_submitted_at: new Date()
      };
      mockInterviewRepository.updateFeedback = jest.fn().mockResolvedValue(mockUpdatedInterview);

      const result = await interviewService.submitFeedback('interview-123', feedbackData, mockUser);

      expect(mockInterviewRepository.findById).toHaveBeenCalledWith('interview-123', 'org-123');
      expect(mockInterviewRepository.updateFeedback).toHaveBeenCalledWith(
        'interview-123',
        feedbackData.feedback,
        feedbackData.rating,
        feedbackData.decision,
        'user-123',
        'org-123'
      );
      expect(result).toEqual(mockUpdatedInterview);
    });

    it('should throw ValidationError for invalid feedback', async () => {
      const invalidFeedback = {
        feedback: 'Good',
        rating: 10, // Invalid rating
        decision: 'proceed'
      };

      await expect(interviewService.submitFeedback('interview-123', invalidFeedback, mockUser)).rejects.toThrow(ValidationError);
    });

    it('should throw BusinessRuleError when submitting feedback for non-completed interview', async () => {
      const mockScheduledInterview = {
        id: 'interview-123',
        status: 'scheduled',
        organization_id: 'org-123'
      };
      mockInterviewRepository.findById = jest.fn().mockResolvedValue(mockScheduledInterview);

      await expect(interviewService.submitFeedback('interview-123', feedbackData, mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(interviewService.submitFeedback('interview-123', feedbackData, mockUser)).rejects.toThrow(/completed/);
    });

    it('should throw NotFoundError when interview does not exist', async () => {
      mockInterviewRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(interviewService.submitFeedback('interview-999', feedbackData, mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('cancel', () => {
    it('should cancel scheduled interview', async () => {
      const mockInterview = {
        id: 'interview-123',
        status: 'scheduled',
        organization_id: 'org-123'
      };
      mockInterviewRepository.findById = jest.fn().mockResolvedValue(mockInterview);

      const mockCancelledInterview = {
        ...mockInterview,
        status: 'cancelled',
        cancelled_at: new Date(),
        cancelled_by: 'user-123',
        cancellation_reason: 'Candidate unavailable'
      };
      mockInterviewRepository.update = jest.fn().mockResolvedValue(mockCancelledInterview);

      const result = await interviewService.cancel('interview-123', mockUser, 'Candidate unavailable');

      expect(mockInterviewRepository.findById).toHaveBeenCalledWith('interview-123', 'org-123');
      expect(mockInterviewRepository.update).toHaveBeenCalledWith(
        'interview-123',
        expect.objectContaining({
          status: 'cancelled',
          cancelled_at: expect.any(Date),
          cancelled_by: 'user-123',
          cancellation_reason: 'Candidate unavailable'
        }),
        'org-123'
      );
      expect(result).toEqual(mockCancelledInterview);
    });

    it('should throw BusinessRuleError when cancelling completed interview', async () => {
      const mockCompletedInterview = {
        id: 'interview-123',
        status: 'completed',
        organization_id: 'org-123'
      };
      mockInterviewRepository.findById = jest.fn().mockResolvedValue(mockCompletedInterview);

      await expect(interviewService.cancel('interview-123', mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(interviewService.cancel('interview-123', mockUser)).rejects.toThrow(/completed/);
    });

    it('should throw NotFoundError when interview does not exist', async () => {
      mockInterviewRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(interviewService.cancel('interview-999', mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('complete', () => {
    it('should complete scheduled interview', async () => {
      const mockInterview = {
        id: 'interview-123',
        status: 'scheduled',
        organization_id: 'org-123'
      };
      mockInterviewRepository.findById = jest.fn().mockResolvedValue(mockInterview);

      const mockCompletedInterview = {
        ...mockInterview,
        status: 'completed',
        completed_at: new Date(),
        updated_by: 'user-123'
      };
      mockInterviewRepository.update = jest.fn().mockResolvedValue(mockCompletedInterview);

      const result = await interviewService.complete('interview-123', mockUser);

      expect(mockInterviewRepository.findById).toHaveBeenCalledWith('interview-123', 'org-123');
      expect(mockInterviewRepository.update).toHaveBeenCalledWith(
        'interview-123',
        expect.objectContaining({
          status: 'completed',
          completed_at: expect.any(Date),
          updated_by: 'user-123'
        }),
        'org-123'
      );
      expect(result).toEqual(mockCompletedInterview);
    });

    it('should throw BusinessRuleError when completing already completed interview', async () => {
      const mockCompletedInterview = {
        id: 'interview-123',
        status: 'completed',
        organization_id: 'org-123'
      };
      mockInterviewRepository.findById = jest.fn().mockResolvedValue(mockCompletedInterview);

      await expect(interviewService.complete('interview-123', mockUser)).rejects.toThrow(BusinessRuleError);
      await expect(interviewService.complete('interview-123', mockUser)).rejects.toThrow(/already completed/);
    });

    it('should throw NotFoundError when interview does not exist', async () => {
      mockInterviewRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(interviewService.complete('interview-999', mockUser)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getUpcomingInterviews', () => {
    it('should get upcoming interviews', async () => {
      const mockInterviews = [
        { id: 'interview-1', scheduled_at: new Date(Date.now() + 3600000) },
        { id: 'interview-2', scheduled_at: new Date(Date.now() + 7200000) }
      ];
      mockInterviewRepository.getUpcoming = jest.fn().mockResolvedValue(mockInterviews);

      const result = await interviewService.getUpcomingInterviews(mockUser, 10);

      expect(mockInterviewRepository.getUpcoming).toHaveBeenCalledWith(10, 'org-123');
      expect(result).toEqual(mockInterviews);
    });

    it('should use default limit if not provided', async () => {
      mockInterviewRepository.getUpcoming = jest.fn().mockResolvedValue([]);

      await interviewService.getUpcomingInterviews(mockUser);

      expect(mockInterviewRepository.getUpcoming).toHaveBeenCalledWith(20, 'org-123');
    });
  });

  describe('getStatistics', () => {
    it('should get interview statistics', async () => {
      const mockStats = [
        { status: 'scheduled', count: 5 },
        { status: 'completed', count: 10 },
        { status: 'cancelled', count: 2 }
      ];
      mockInterviewRepository.getCountByStatus = jest.fn().mockResolvedValue(mockStats);

      const result = await interviewService.getStatistics(mockUser);

      expect(mockInterviewRepository.getCountByStatus).toHaveBeenCalledWith('org-123');
      expect(result).toEqual({
        byStatus: mockStats,
        total: 17
      });
    });

    it('should handle empty statistics', async () => {
      mockInterviewRepository.getCountByStatus = jest.fn().mockResolvedValue([]);

      const result = await interviewService.getStatistics(mockUser);

      expect(result).toEqual({
        byStatus: [],
        total: 0
      });
    });
  });
});
