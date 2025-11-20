/**
 * Tests for PerformanceController
 * 
 * Controller Layer: HTTP request/response handling
 * Tests verify:
 * - Request parsing (params, query, body)
 * - Service method calls with correct arguments
 * - Response formatting with appropriate status codes
 * - Error handling and status code logic
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock service BEFORE importing controller
class MockPerformanceService {
  createReview = jest.fn();
  getReview = jest.fn();
  listReviews = jest.fn();
  updateReview = jest.fn();
  getReviewsStatistics = jest.fn();
  createGoal = jest.fn();
  updateGoal = jest.fn();
  listGoals = jest.fn();
  getGoalsStatistics = jest.fn();
  createFeedback = jest.fn();
  getEmployeeFeedback = jest.fn();
}

jest.unstable_mockModule('../../../../src/products/nexus/services/performanceService.js', () => ({
  default: MockPerformanceService
}));

// Import controller AFTER mocking
const { default: PerformanceController } = await import('../../../../src/products/nexus/controllers/performanceController.js');

describe('PerformanceController', () => {
  let controller;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    controller = new PerformanceController();
    
    mockReq = {
      user: {
        organization_id: 'org-123',
        id: 'user-123'
      },
      params: {},
      query: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('createReview', () => {
    it('should create a review successfully', async () => {
      const reviewData = {
        employeeId: 'emp-123',
        reviewerId: 'emp-456',
        reviewDate: '2025-01-15',
        status: 'draft'
      };

      mockReq.body = reviewData;

      controller.service.createReview.mockResolvedValue({
        id: 'review-123',
        ...reviewData,
        organizationId: 'org-123'
      });

      await controller.createReview(mockReq, mockRes);

      expect(controller.service.createReview).toHaveBeenCalledWith(
        reviewData,
        'org-123',
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'review-123',
          employeeId: 'emp-123'
        })
      });
    });

    it('should handle errors during review creation', async () => {
      mockReq.body = { employeeId: 'emp-123' };

      controller.service.createReview.mockRejectedValue(
        new Error('Reviewer is required')
      );

      await controller.createReview(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Reviewer is required'
      });
    });
  });

  describe('getReview', () => {
    it('should get a review by ID successfully', async () => {
      mockReq.params = { id: 'review-123' };

      const mockReview = {
        id: 'review-123',
        employeeId: 'emp-123',
        reviewerId: 'emp-456',
        status: 'completed'
      };

      controller.service.getReview.mockResolvedValue(mockReview);

      await controller.getReview(mockReq, mockRes);

      expect(controller.service.getReview).toHaveBeenCalledWith(
        'review-123',
        'org-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReview
      });
    });

    it('should return 404 when review not found', async () => {
      mockReq.params = { id: 'review-nonexistent' };

      controller.service.getReview.mockRejectedValue(
        new Error('Review not found')
      );

      await controller.getReview(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Review not found'
      });
    });

    it('should return 500 for other errors', async () => {
      mockReq.params = { id: 'review-123' };

      controller.service.getReview.mockRejectedValue(
        new Error('Database error')
      );

      await controller.getReview(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('listReviews', () => {
    it('should list reviews with filters', async () => {
      mockReq.query = {
        employeeId: 'emp-123',
        status: 'completed',
        limit: '20',
        offset: '0'
      };

      const mockReviews = [
        { id: 'review-1', employeeId: 'emp-123', status: 'completed' },
        { id: 'review-2', employeeId: 'emp-123', status: 'completed' }
      ];

      controller.service.listReviews.mockResolvedValue(mockReviews);

      await controller.listReviews(mockReq, mockRes);

      expect(controller.service.listReviews).toHaveBeenCalledWith(
        { employeeId: 'emp-123', status: 'completed' },
        'org-123',
        { limit: 20, offset: 0 }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReviews
      });
    });

    it('should use default pagination when not provided', async () => {
      mockReq.query = {};

      controller.service.listReviews.mockResolvedValue([]);

      await controller.listReviews(mockReq, mockRes);

      expect(controller.service.listReviews).toHaveBeenCalledWith(
        {},
        'org-123',
        { limit: 50, offset: 0 }
      );
    });

    it('should handle errors when listing reviews', async () => {
      mockReq.query = {};

      controller.service.listReviews.mockRejectedValue(
        new Error('Database error')
      );

      await controller.listReviews(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('updateReview', () => {
    it('should update a review successfully', async () => {
      mockReq.params = { id: 'review-123' };
      mockReq.body = { status: 'completed', overallRating: 4.5 };

      controller.service.updateReview.mockResolvedValue({
        id: 'review-123',
        status: 'completed',
        overallRating: 4.5
      });

      await controller.updateReview(mockReq, mockRes);

      expect(controller.service.updateReview).toHaveBeenCalledWith(
        'review-123',
        mockReq.body,
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: 'review-123' })
      });
    });

    it('should return 404 when review not found', async () => {
      mockReq.params = { id: 'review-nonexistent' };
      mockReq.body = { status: 'completed' };

      controller.service.updateReview.mockRejectedValue(
        new Error('Review not found')
      );

      await controller.updateReview(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Review not found'
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.params = { id: 'review-123' };
      mockReq.body = { overallRating: 6 };

      controller.service.updateReview.mockRejectedValue(
        new Error('Rating must be between 1 and 5')
      );

      await controller.updateReview(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    });
  });

  describe('getReviewsStatistics', () => {
    it('should get reviews statistics successfully', async () => {
      const mockStats = {
        total: 150,
        completed: 120,
        pending: 20,
        draft: 10,
        averageRating: 4.2
      };

      controller.service.getReviewsStatistics.mockResolvedValue(mockStats);

      await controller.getReviewsStatistics(mockReq, mockRes);

      expect(controller.service.getReviewsStatistics).toHaveBeenCalledWith('org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });

    it('should handle errors when getting statistics', async () => {
      controller.service.getReviewsStatistics.mockRejectedValue(
        new Error('Database error')
      );

      await controller.getReviewsStatistics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('createGoal', () => {
    it('should create a goal successfully', async () => {
      const goalData = {
        employeeId: 'emp-123',
        title: 'Improve sales by 20%',
        dueDate: '2025-12-31',
        status: 'active'
      };

      mockReq.body = goalData;

      controller.service.createGoal.mockResolvedValue({
        id: 'goal-123',
        ...goalData,
        organizationId: 'org-123'
      });

      await controller.createGoal(mockReq, mockRes);

      expect(controller.service.createGoal).toHaveBeenCalledWith(
        goalData,
        'org-123',
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'goal-123',
          title: 'Improve sales by 20%'
        })
      });
    });

    it('should handle errors during goal creation', async () => {
      mockReq.body = { title: 'Goal' };

      controller.service.createGoal.mockRejectedValue(
        new Error('Employee ID is required')
      );

      await controller.createGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Employee ID is required'
      });
    });
  });

  describe('updateGoal', () => {
    it('should update a goal successfully', async () => {
      mockReq.params = { id: 'goal-123' };
      mockReq.body = { status: 'completed', progress: 100 };

      controller.service.updateGoal.mockResolvedValue({
        id: 'goal-123',
        status: 'completed',
        progress: 100
      });

      await controller.updateGoal(mockReq, mockRes);

      expect(controller.service.updateGoal).toHaveBeenCalledWith(
        'goal-123',
        mockReq.body,
        'org-123',
        'user-123'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: 'goal-123' })
      });
    });

    it('should return 404 when goal not found', async () => {
      mockReq.params = { id: 'goal-nonexistent' };
      mockReq.body = { status: 'completed' };

      controller.service.updateGoal.mockRejectedValue(
        new Error('Goal not found')
      );

      await controller.updateGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Goal not found'
      });
    });

    it('should return 400 for validation errors', async () => {
      mockReq.params = { id: 'goal-123' };
      mockReq.body = { progress: 150 };

      controller.service.updateGoal.mockRejectedValue(
        new Error('Progress must be between 0 and 100')
      );

      await controller.updateGoal(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Progress must be between 0 and 100'
      });
    });
  });

  describe('listGoals', () => {
    it('should list goals with filters', async () => {
      mockReq.query = {
        employeeId: 'emp-123',
        status: 'active',
        limit: '20',
        offset: '0'
      };

      const mockGoals = [
        { id: 'goal-1', employeeId: 'emp-123', status: 'active' },
        { id: 'goal-2', employeeId: 'emp-123', status: 'active' }
      ];

      controller.service.listGoals.mockResolvedValue(mockGoals);

      await controller.listGoals(mockReq, mockRes);

      expect(controller.service.listGoals).toHaveBeenCalledWith(
        { employeeId: 'emp-123', status: 'active' },
        'org-123',
        { limit: 20, offset: 0 }
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockGoals
      });
    });

    it('should use default pagination when not provided', async () => {
      mockReq.query = {};

      controller.service.listGoals.mockResolvedValue([]);

      await controller.listGoals(mockReq, mockRes);

      expect(controller.service.listGoals).toHaveBeenCalledWith(
        {},
        'org-123',
        { limit: 50, offset: 0 }
      );
    });

    it('should handle errors when listing goals', async () => {
      mockReq.query = {};

      controller.service.listGoals.mockRejectedValue(
        new Error('Database error')
      );

      await controller.listGoals(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('getGoalsStatistics', () => {
    it('should get goals statistics successfully', async () => {
      const mockStats = {
        total: 200,
        active: 150,
        completed: 45,
        cancelled: 5,
        averageProgress: 65.5
      };

      controller.service.getGoalsStatistics.mockResolvedValue(mockStats);

      await controller.getGoalsStatistics(mockReq, mockRes);

      expect(controller.service.getGoalsStatistics).toHaveBeenCalledWith('org-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });

    it('should handle errors when getting statistics', async () => {
      controller.service.getGoalsStatistics.mockRejectedValue(
        new Error('Database error')
      );

      await controller.getGoalsStatistics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('createFeedback', () => {
    it('should create feedback successfully', async () => {
      const feedbackData = {
        employeeId: 'emp-123',
        providerId: 'emp-456',
        feedbackText: 'Great work on the project',
        feedbackType: 'positive'
      };

      mockReq.body = feedbackData;

      controller.service.createFeedback.mockResolvedValue({
        id: 'feedback-123',
        ...feedbackData,
        organizationId: 'org-123'
      });

      await controller.createFeedback(mockReq, mockRes);

      expect(controller.service.createFeedback).toHaveBeenCalledWith(
        feedbackData,
        'org-123',
        'user-123'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: 'feedback-123',
          feedbackText: 'Great work on the project'
        })
      });
    });

    it('should handle errors during feedback creation', async () => {
      mockReq.body = { employeeId: 'emp-123' };

      controller.service.createFeedback.mockRejectedValue(
        new Error('Feedback text is required')
      );

      await controller.createFeedback(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Feedback text is required'
      });
    });
  });

  describe('getEmployeeFeedback', () => {
    it('should get employee feedback successfully', async () => {
      mockReq.params = { employeeId: 'emp-123' };
      mockReq.query = { limit: '20' };

      const mockFeedback = [
        { id: 'feedback-1', employeeId: 'emp-123', feedbackType: 'positive' },
        { id: 'feedback-2', employeeId: 'emp-123', feedbackType: 'constructive' }
      ];

      controller.service.getEmployeeFeedback.mockResolvedValue(mockFeedback);

      await controller.getEmployeeFeedback(mockReq, mockRes);

      expect(controller.service.getEmployeeFeedback).toHaveBeenCalledWith(
        'emp-123',
        'org-123',
        20
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockFeedback
      });
    });

    it('should use default limit when not provided', async () => {
      mockReq.params = { employeeId: 'emp-123' };
      mockReq.query = {};

      controller.service.getEmployeeFeedback.mockResolvedValue([]);

      await controller.getEmployeeFeedback(mockReq, mockRes);

      expect(controller.service.getEmployeeFeedback).toHaveBeenCalledWith(
        'emp-123',
        'org-123',
        50
      );
    });

    it('should handle errors when getting feedback', async () => {
      mockReq.params = { employeeId: 'emp-123' };
      mockReq.query = {};

      controller.service.getEmployeeFeedback.mockRejectedValue(
        new Error('Database error')
      );

      await controller.getEmployeeFeedback(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });
});
