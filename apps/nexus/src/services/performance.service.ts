/**
 * Performance Service
 * API service layer for performance reviews and goals
 */

import { apiClient } from './api';
import type {
  PerformanceReview,
  CreatePerformanceReviewDTO,
  UpdatePerformanceReviewDTO,
  PerformanceReviewFilters,
  Goal,
  CreateGoalDTO,
  UpdateGoalDTO,
  GoalFilters,
  ReviewStatistics,
  GoalStatistics,
} from '@/types/performance.types';

// ============ Performance Reviews ============

/**
 * Get all performance reviews with optional filters
 */
async function listReviews(filters?: PerformanceReviewFilters): Promise<PerformanceReview[]> {
  const response = await apiClient.get<{ success: boolean; data: PerformanceReview[] }>('/performance/reviews', { params: filters });
  return response.data.data;
}

/**
 * Get a single performance review by ID
 */
async function getReview(id: string): Promise<PerformanceReview> {
  const response = await apiClient.get<{ success: boolean; data: PerformanceReview }>(`/performance/reviews/${id}`);
  return response.data.data;
}

/**
 * Get all reviews for a specific employee
 */
async function getEmployeeReviews(employeeId: string): Promise<PerformanceReview[]> {
  const response = await apiClient.get<{ success: boolean; data: PerformanceReview[] }>(`/performance/reviews/employee/${employeeId}`);
  return response.data.data;
}

/**
 * Get all reviews where user is the reviewer
 */
async function getReviewerReviews(reviewerId: string): Promise<PerformanceReview[]> {
  const response = await apiClient.get<{ success: boolean; data: PerformanceReview[] }>(`/performance/reviews/reviewer/${reviewerId}`);
  return response.data.data;
}

/**
 * Create a new performance review
 */
async function createReview(review: CreatePerformanceReviewDTO): Promise<PerformanceReview> {
  const response = await apiClient.post<{ success: boolean; data: PerformanceReview }>('/performance/reviews', review);
  return response.data.data;
}

/**
 * Update an existing performance review
 */
async function updateReview(id: string, updates: UpdatePerformanceReviewDTO): Promise<PerformanceReview> {
  const response = await apiClient.put<{ success: boolean; data: PerformanceReview }>(`/performance/reviews/${id}`, updates);
  return response.data.data;
}

/**
 * Delete a performance review
 */
async function deleteReview(id: string): Promise<void> {
  await apiClient.delete(`/performance/reviews/${id}`);
}

/**
 * Submit a review for completion
 */
async function submitReview(id: string): Promise<PerformanceReview> {
  const response = await apiClient.post<{ success: boolean; data: PerformanceReview }>(`/performance/reviews/${id}/submit`);
  return response.data.data;
}

/**
 * Get review statistics
 */
async function getReviewStatistics(): Promise<ReviewStatistics> {
  const response = await apiClient.get<{ success: boolean; data: ReviewStatistics }>('/performance/reviews/statistics');
  return response.data.data;
}

// ============ Goals ============

/**
 * Get all goals with optional filters
 */
async function listGoals(filters?: GoalFilters): Promise<Goal[]> {
  const response = await apiClient.get<{ success: boolean; data: Goal[] }>('/performance/goals', { params: filters });
  return response.data.data;
}

/**
 * Get a single goal by ID
 */
async function getGoal(id: string): Promise<Goal> {
  const response = await apiClient.get<{ success: boolean; data: Goal }>(`/performance/goals/${id}`);
  return response.data.data;
}

/**
 * Get all goals for a specific employee
 */
async function getEmployeeGoals(employeeId: string): Promise<Goal[]> {
  const response = await apiClient.get<{ success: boolean; data: Goal[] }>(`/performance/goals/employee/${employeeId}`);
  return response.data.data;
}

/**
 * Create a new goal
 */
async function createGoal(goal: CreateGoalDTO): Promise<Goal> {
  const response = await apiClient.post<{ success: boolean; data: Goal }>('/performance/goals', goal);
  return response.data.data;
}

/**
 * Update an existing goal
 */
async function updateGoal(id: string, updates: UpdateGoalDTO): Promise<Goal> {
  const response = await apiClient.put<{ success: boolean; data: Goal }>(`/performance/goals/${id}`, updates);
  return response.data.data;
}

/**
 * Delete a goal
 */
async function deleteGoal(id: string): Promise<void> {
  await apiClient.delete(`/performance/goals/${id}`);
}

/**
 * Update goal progress
 */
async function updateGoalProgress(id: string, progress: number): Promise<Goal> {
  const response = await apiClient.patch<{ success: boolean; data: Goal }>(`/performance/goals/${id}/progress`, { progress });
  return response.data.data;
}

/**
 * Complete a goal
 */
async function completeGoal(id: string): Promise<Goal> {
  const response = await apiClient.post<{ success: boolean; data: Goal }>(`/performance/goals/${id}/complete`);
  return response.data.data;
}

/**
 * Get goal statistics
 */
async function getGoalStatistics(): Promise<GoalStatistics> {
  const response = await apiClient.get<{ success: boolean; data: GoalStatistics }>('/performance/goals/statistics');
  return response.data.data;
}

export const performanceService = {
  // Reviews
  listReviews,
  getReview,
  getEmployeeReviews,
  getReviewerReviews,
  createReview,
  updateReview,
  deleteReview,
  submitReview,
  getReviewStatistics,
  
  // Goals
  listGoals,
  getGoal,
  getEmployeeGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  updateGoalProgress,
  completeGoal,
  getGoalStatistics,
};
