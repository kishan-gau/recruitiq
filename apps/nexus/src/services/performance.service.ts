/**
 * Performance Service
 * API service layer for performance reviews and goals
 * NOW USES: @recruitiq/api-client for type-safe API calls
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';
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

// Create singleton instance
const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

// ============ Performance Reviews ============

async function listReviews(filters?: PerformanceReviewFilters): Promise<PerformanceReview[]> {
  const response = await nexusClient.listPerformanceReviews(filters);
  // Backend returns { success: true, data: { reviews: [...], total, limit, offset } }
  return response.data.reviews as PerformanceReview[];
}

async function getReview(id: string): Promise<PerformanceReview> {
  const response = await nexusClient.getPerformanceReview(id);
  return response.data as PerformanceReview;
}

async function getEmployeeReviews(employeeId: string): Promise<PerformanceReview[]> {
  const response = await nexusClient.getEmployeeReviews(employeeId);
  return response.data as PerformanceReview[];
}

async function getReviewerReviews(reviewerId: string): Promise<PerformanceReview[]> {
  const response = await nexusClient.getReviewerReviews(reviewerId);
  return response.data as PerformanceReview[];
}

async function createReview(review: CreatePerformanceReviewDTO): Promise<PerformanceReview> {
  const response = await nexusClient.createPerformanceReview(review);
  return response.data as PerformanceReview;
}

async function updateReview(id: string, updates: UpdatePerformanceReviewDTO): Promise<PerformanceReview> {
  const response = await nexusClient.updatePerformanceReview(id, updates);
  return response.data as PerformanceReview;
}

async function deleteReview(id: string): Promise<void> {
  await nexusClient.deletePerformanceReview(id);
}

async function submitReview(id: string): Promise<PerformanceReview> {
  const response = await nexusClient.submitPerformanceReview(id);
  return response.data as PerformanceReview;
}

async function getReviewStatistics(): Promise<ReviewStatistics> {
  const response = await nexusClient.getReviewStatistics();
  return response.data as ReviewStatistics;
}

// ============ Goals ============

async function listGoals(filters?: GoalFilters): Promise<Goal[]> {
  const response = await nexusClient.listGoals(filters);
  return response.data as Goal[];
}

async function getGoal(id: string): Promise<Goal> {
  const response = await nexusClient.getGoal(id);
  return response.data as Goal;
}

async function getEmployeeGoals(employeeId: string): Promise<Goal[]> {
  const response = await nexusClient.getEmployeeGoals(employeeId);
  return response.data as Goal[];
}

async function createGoal(goal: CreateGoalDTO): Promise<Goal> {
  const response = await nexusClient.createGoal(goal);
  return response.data as Goal;
}

async function updateGoal(id: string, updates: UpdateGoalDTO): Promise<Goal> {
  const response = await nexusClient.updateGoal(id, updates);
  return response.data as Goal;
}

async function deleteGoal(id: string): Promise<void> {
  await nexusClient.deleteGoal(id);
}

async function updateGoalProgress(id: string, progress: number): Promise<Goal> {
  const response = await nexusClient.updateGoalProgress(id, progress);
  return response.data as Goal;
}

async function completeGoal(id: string): Promise<Goal> {
  const response = await nexusClient.completeGoal(id);
  return response.data as Goal;
}

async function getGoalStatistics(): Promise<GoalStatistics> {
  const response = await nexusClient.getGoalStatistics();
  return response.data as GoalStatistics;
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
