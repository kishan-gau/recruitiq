/**
 * Performance Service
 * Handles employee performance reviews and goals
 * 
 * Features:
 * - View performance reviews
 * - Track goals and objectives
 * - Access feedback history
 * - View development plans
 */

import { NexusClient, APIClient } from '@recruitiq/api-client';

const apiClient = new APIClient();
const nexusClient = new NexusClient(apiClient);

// Types
export interface PerformanceReview {
  id: string;
  reviewPeriod: string;
  reviewDate: string;
  reviewer: string;
  reviewerTitle: string;
  overallRating: number;
  maxRating: number;
  status: 'draft' | 'submitted' | 'completed';
  categories: Array<{
    name: string;
    rating: number;
    comments?: string;
  }>;
  strengths?: string;
  areasForImprovement?: string;
  developmentPlan?: string;
  employeeComments?: string;
  goals?: string[];
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'performance' | 'development' | 'project' | 'skill';
  startDate: string;
  targetDate: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;
  priority: 'low' | 'medium' | 'high';
  milestones: Array<{
    title: string;
    dueDate: string;
    completed: boolean;
  }>;
  assignedBy: string;
  lastUpdated: string;
}

export interface Feedback {
  id: string;
  type: '360' | 'peer' | 'manager' | 'self';
  date: string;
  from: string;
  fromTitle?: string;
  isAnonymous: boolean;
  rating?: number;
  feedback: string;
  category?: string;
}

export interface DevelopmentPlan {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'on_hold';
  activities: Array<{
    type: 'training' | 'mentoring' | 'project' | 'reading' | 'other';
    title: string;
    description: string;
    targetDate: string;
    completed: boolean;
    completedDate?: string;
  }>;
  skillsToImprove: string[];
  progress: number;
}

/**
 * Performance Service
 * Provides methods for performance management
 */
export const performanceService = {
  /**
   * Lists performance reviews
   */
  async listPerformanceReviews(params?: {
    year?: number;
    status?: string;
  }): Promise<PerformanceReview[]> {
    const response = await nexusClient.listPerformanceReviews(params);
    return response.data.reviews || response.data;
  },

  /**
   * Gets a specific performance review
   */
  async getPerformanceReview(reviewId: string): Promise<PerformanceReview> {
    const response = await nexusClient.getPerformanceReview(reviewId);
    return response.data.review || response.data;
  },

  /**
   * Lists employee goals
   */
  async listGoals(params?: {
    status?: string;
    category?: string;
  }): Promise<Goal[]> {
    const response = await nexusClient.listGoals(params);
    return response.data.goals || response.data;
  },

  /**
   * Gets a specific goal
   */
  async getGoal(goalId: string): Promise<Goal> {
    const response = await nexusClient.getGoal(goalId);
    return response.data.goal || response.data;
  },

  /**
   * Updates goal progress
   */
  async updateGoalProgress(goalId: string, progress: number): Promise<Goal> {
    const response = await nexusClient.updateGoalProgress(goalId, { progress });
    return response.data.goal || response.data;
  },

  /**
   * Marks a goal milestone as complete
   */
  async completeMilestone(goalId: string, milestoneIndex: number): Promise<Goal> {
    const response = await nexusClient.completeGoalMilestone(goalId, milestoneIndex);
    return response.data.goal || response.data;
  },

  /**
   * Lists feedback received
   */
  async listFeedback(params?: {
    type?: string;
    year?: number;
  }): Promise<Feedback[]> {
    const response = await nexusClient.listFeedback(params);
    return response.data.feedback || response.data;
  },

  /**
   * Gets development plans
   */
  async listDevelopmentPlans(params?: {
    status?: string;
  }): Promise<DevelopmentPlan[]> {
    const response = await nexusClient.listDevelopmentPlans(params);
    return response.data.plans || response.data;
  },

  /**
   * Gets a specific development plan
   */
  async getDevelopmentPlan(planId: string): Promise<DevelopmentPlan> {
    const response = await nexusClient.getDevelopmentPlan(planId);
    return response.data.plan || response.data;
  },

  /**
   * Marks a development activity as complete
   */
  async completeActivity(planId: string, activityIndex: number): Promise<DevelopmentPlan> {
    const response = await nexusClient.completeDevelopmentActivity(planId, activityIndex);
    return response.data.plan || response.data;
  },
};
