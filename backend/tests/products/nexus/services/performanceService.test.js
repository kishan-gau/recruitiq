/**
 * PerformanceService Unit Tests
 * Tests for employee performance management business logic
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

jest.unstable_mockModule('../../../../src/config/database.js', () => ({
  query: mockQuery
}));

jest.unstable_mockModule('../../../../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import service after mocking
const { default: PerformanceService } = await import('../../../../src/products/nexus/services/performanceService.js');

describe('PerformanceService', () => {
  let service;
  const organizationId = '123e4567-e89b-12d3-a456-426614174000';
  const userId = '223e4567-e89b-12d3-a456-426614174001';
  const reviewId = '323e4567-e89b-12d3-a456-426614174002';
  const employeeId = '423e4567-e89b-12d3-a456-426614174003';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PerformanceService();
  });

  describe('createReview', () => {
    it('should create performance review successfully', async () => {
      const reviewData = {
        employee_id: employeeId,
        reviewer_id: userId,
        review_period_start: '2025-01-01',
        review_period_end: '2025-12-31',
        due_date: '2026-01-15',
        review_type: 'annual',
        status: 'draft'
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: reviewId, ...reviewData, organization_id: organizationId }]
      });

      const result = await service.createReview(reviewData, organizationId, userId);

      expect(result.id).toBe(reviewId);
      expect(result.employee_id).toBe(employeeId);
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should throw error if employee_id is missing', async () => {
      const reviewData = {
        review_period_start: '2025-01-01',
        review_period_end: '2025-12-31'
      };

      await expect(
        service.createReview(reviewData, organizationId, userId)
      ).rejects.toThrow('Employee ID is required');
    });

    it('should throw error if review_period_start is missing', async () => {
      const reviewData = {
        employee_id: employeeId,
        review_period_end: '2025-12-31'
      };

      await expect(
        service.createReview(reviewData, organizationId, userId)
      ).rejects.toThrow('Review period start date is required');
    });

    it('should throw error if review_period_end is missing', async () => {
      const reviewData = {
        employee_id: employeeId,
        review_period_start: '2025-01-01'
      };

      await expect(
        service.createReview(reviewData, organizationId, userId)
      ).rejects.toThrow('Review period end date is required');
    });

    it('should default status to draft', async () => {
      const reviewData = {
        employee_id: employeeId,
        review_period_start: '2025-01-01',
        review_period_end: '2025-12-31'
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: reviewId, ...reviewData, status: 'draft' }]
      });

      const result = await service.createReview(reviewData, organizationId, userId);

      expect(result.status).toBe('draft');
    });

    it('should default review_type to annual', async () => {
      const reviewData = {
        employee_id: employeeId,
        review_period_start: '2025-01-01',
        review_period_end: '2025-12-31'
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: reviewId, ...reviewData, review_type: 'annual' }]
      });

      const result = await service.createReview(reviewData, organizationId, userId);

      expect(result.review_type).toBe('annual');
    });

    it('should default reviewer_id to current user if not provided', async () => {
      const reviewData = {
        employee_id: employeeId,
        review_period_start: '2025-01-01',
        review_period_end: '2025-12-31'
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: reviewId, ...reviewData, reviewer_id: userId }]
      });

      const result = await service.createReview(reviewData, organizationId, userId);

      expect(result.reviewer_id).toBe(userId);
    });

    it('should handle responses as JSON object', async () => {
      const reviewData = {
        employee_id: employeeId,
        review_period_start: '2025-01-01',
        review_period_end: '2025-12-31',
        responses: { q1: 'answer1', q2: 'answer2' }
      };

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: reviewId, ...reviewData }]
      });

      const result = await service.createReview(reviewData, organizationId, userId);

      expect(result.responses).toEqual(reviewData.responses);
    });
  });

  describe('getReview', () => {
    it('should get review with employee and reviewer names', async () => {
      const review = {
        id: reviewId,
        employee_id: employeeId,
        employee_name: 'John Doe',
        employee_email: 'john@example.com',
        reviewer_name: 'Jane Smith',
        overall_rating: 4.5
      };

      mockQuery.mockResolvedValueOnce({ rows: [review] });

      const result = await service.getReview(reviewId, organizationId);

      expect(result).toEqual(review);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('employee_name'),
        [reviewId, organizationId],
        organizationId,
        expect.any(Object)
      );
    });

    it('should throw error if review not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.getReview(reviewId, organizationId)
      ).rejects.toThrow('Performance review not found');
    });
  });

  describe('listReviews', () => {
    it('should list all reviews with pagination', async () => {
      const reviews = [
        { id: reviewId, employee_name: 'John Doe', status: 'completed' },
        { id: '456', employee_name: 'Jane Smith', status: 'draft' }
      ];

      mockQuery.mockResolvedValueOnce({ rows: reviews });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const result = await service.listReviews({}, organizationId);

      expect(result.reviews).toEqual(reviews);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('should filter by employeeId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.listReviews({ employeeId }, organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('pr.employee_id = $2'),
        expect.arrayContaining([organizationId, employeeId]),
        organizationId,
        expect.any(Object)
      );
    });

    it('should filter by reviewerId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.listReviews({ reviewerId: userId }, organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('pr.reviewer_id = $2'),
        expect.arrayContaining([organizationId, userId]),
        organizationId,
        expect.any(Object)
      );
    });

    it('should filter by status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.listReviews({ status: 'completed' }, organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('pr.status = $2'),
        expect.arrayContaining([organizationId, 'completed']),
        organizationId,
        expect.any(Object)
      );
    });

    it('should filter by reviewType', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.listReviews({ reviewType: 'annual' }, organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('pr.review_type = $2'),
        expect.arrayContaining([organizationId, 'annual']),
        organizationId,
        expect.any(Object)
      );
    });

    it('should apply custom pagination', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.listReviews({}, organizationId, { limit: 10, offset: 20 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        expect.arrayContaining([organizationId, 10, 20]),
        organizationId,
        expect.any(Object)
      );
    });

    it('should order by completed_date DESC NULLS LAST', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      await service.listReviews({}, organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY pr.completed_date DESC NULLS LAST'),
        expect.any(Array),
        organizationId,
        expect.any(Object)
      );
    });
  });

  describe('updateReview', () => {
    it('should update review successfully', async () => {
      const updateData = {
        overall_rating: 4.5,
        status: 'completed',
        completed_date: '2026-01-15'
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ id: reviewId }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: reviewId, ...updateData }]
      });

      const result = await service.updateReview(reviewId, updateData, organizationId, userId);

      expect(result.overall_rating).toBe(4.5);
      expect(result.status).toBe('completed');
    });

    it('should throw error if review not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.updateReview(reviewId, { status: 'completed' }, organizationId, userId)
      ).rejects.toThrow('Performance review not found');
    });

    it('should return existing review if no updates', async () => {
      const existingReview = {
        id: reviewId,
        employee_name: 'John Doe',
        status: 'draft'
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ id: reviewId }] });
      mockQuery.mockResolvedValueOnce({ rows: [existingReview] });

      const result = await service.updateReview(reviewId, {}, organizationId, userId);

      expect(result).toEqual(existingReview);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should update responses JSON field', async () => {
      const updateData = {
        responses: { q1: 'new answer', q2: 'another answer' }
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ id: reviewId }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: reviewId, ...updateData }]
      });

      const result = await service.updateReview(reviewId, updateData, organizationId, userId);

      expect(result.responses).toEqual(updateData.responses);
    });
  });

  describe('deleteReview', () => {
    it('should soft delete review successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: reviewId }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.deleteReview(reviewId, organizationId, userId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Performance review deleted successfully');
    });

    it('should throw error if review not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.deleteReview(reviewId, organizationId, userId)
      ).rejects.toThrow('Performance review not found');
    });
  });

  describe('getReviewsStatistics', () => {
    it('should get reviews statistics', async () => {
      const stats = {
        total_reviews: 100,
        completed_reviews: 75,
        pending_reviews: 15,
        in_progress_reviews: 10,
        average_rating: 4.2,
        recent_reviews: 20
      };

      mockQuery.mockResolvedValueOnce({ rows: [stats] });

      const result = await service.getReviewsStatistics(organizationId);

      expect(result).toEqual(stats);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) as total_reviews'),
        [organizationId],
        organizationId,
        expect.any(Object)
      );
    });

    it('should return default statistics if no reviews', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getReviewsStatistics(organizationId);

      expect(result).toEqual({
        total_reviews: 0,
        completed_reviews: 0,
        pending_reviews: 0,
        in_progress_reviews: 0,
        average_rating: null,
        recent_reviews: 0
      });
    });

    it('should calculate average rating correctly', async () => {
      const stats = {
        total_reviews: 10,
        completed_reviews: 8,
        pending_reviews: 2,
        in_progress_reviews: 0,
        average_rating: 4.5,
        recent_reviews: 5
      };

      mockQuery.mockResolvedValueOnce({ rows: [stats] });

      const result = await service.getReviewsStatistics(organizationId);

      expect(result.average_rating).toBe(4.5);
    });

    it('should count recent reviews (last 30 days)', async () => {
      const stats = {
        total_reviews: 100,
        completed_reviews: 75,
        pending_reviews: 15,
        in_progress_reviews: 10,
        average_rating: 4.2,
        recent_reviews: 20
      };

      mockQuery.mockResolvedValueOnce({ rows: [stats] });

      const result = await service.getReviewsStatistics(organizationId);

      expect(result.recent_reviews).toBe(20);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("completed_date >= CURRENT_DATE - INTERVAL '30 days'"),
        [organizationId],
        organizationId,
        expect.any(Object)
      );
    });
  });

  describe('getGoalsStatistics', () => {
    it('should get goals statistics', async () => {
      const stats = {
        total_goals: 150,
        completed_goals: 100,
        in_progress_goals: 30,
        not_started_goals: 20,
        overdue_goals: 10,
        recent_goals: 25
      };

      mockQuery.mockResolvedValueOnce({ rows: [stats] });

      const result = await service.getGoalsStatistics(organizationId);

      expect(result).toEqual(stats);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(*) as total_goals'),
        [organizationId],
        organizationId,
        expect.any(Object)
      );
    });

    it('should return default statistics if no goals', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await service.getGoalsStatistics(organizationId);

      expect(result).toEqual({
        total_goals: 0,
        completed_goals: 0,
        in_progress_goals: 0,
        not_started_goals: 0,
        overdue_goals: 0,
        recent_goals: 0
      });
    });

    it('should count overdue goals correctly', async () => {
      const stats = {
        total_goals: 100,
        completed_goals: 75,
        in_progress_goals: 15,
        not_started_goals: 10,
        overdue_goals: 5,
        recent_goals: 20
      };

      mockQuery.mockResolvedValueOnce({ rows: [stats] });

      const result = await service.getGoalsStatistics(organizationId);

      expect(result.overdue_goals).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("target_date < CURRENT_DATE AND status != 'completed'"),
        [organizationId],
        organizationId,
        expect.any(Object)
      );
    });

    it('should count recent goals (last 30 days)', async () => {
      const stats = {
        total_goals: 100,
        completed_goals: 75,
        in_progress_goals: 15,
        not_started_goals: 10,
        overdue_goals: 5,
        recent_goals: 30
      };

      mockQuery.mockResolvedValueOnce({ rows: [stats] });

      const result = await service.getGoalsStatistics(organizationId);

      expect(result.recent_goals).toBe(30);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("created_at >= CURRENT_DATE - INTERVAL '30 days'"),
        [organizationId],
        organizationId,
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    it('should handle database errors in createReview', async () => {
      const reviewData = {
        employee_id: employeeId,
        review_period_start: '2025-01-01',
        review_period_end: '2025-12-31'
      };

      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        service.createReview(reviewData, organizationId, userId)
      ).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle database errors in getReview', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

      await expect(
        service.getReview(reviewId, organizationId)
      ).rejects.toThrow('Query timeout');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle database errors in getReviewsStatistics', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection lost'));

      await expect(
        service.getReviewsStatistics(organizationId)
      ).rejects.toThrow('Connection lost');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle database errors in getGoalsStatistics', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection lost'));

      await expect(
        service.getGoalsStatistics(organizationId)
      ).rejects.toThrow('Connection lost');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
