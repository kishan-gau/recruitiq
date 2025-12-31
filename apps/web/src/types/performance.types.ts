/**
 * Performance review types for HRIS performance management
 */

import type { AuditFields } from './common.types';

export type ReviewType = 
  | 'annual'
  | 'mid-year'
  | 'quarterly'
  | 'probation'
  | 'project'
  | '360'
  | 'ad-hoc';

export type ReviewStatus = 
  | 'draft'
  | 'in_progress'
  | 'pending_approval'
  | 'completed'
  | 'cancelled';

export type RatingScale = 1 | 2 | 3 | 4 | 5;
export type ReviewRating = RatingScale; // Alias for backward compatibility

export type GoalCategory = 
  | 'performance'
  | 'development'
  | 'behavioral'
  | 'technical'
  | 'leadership'
  | 'project'
  | 'other';

export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';
export type GoalStatus = 'draft' | 'active' | 'completed' | 'cancelled' | 'on_hold';

export interface PerformanceReview extends AuditFields {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName?: string; // For UI display
  reviewerId?: string;
  reviewerName?: string;
  reviewType: ReviewType;
  status: ReviewStatus;
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  reviewDate?: string;
  dueDate?: string;
  overallRating?: RatingScale;
  strengths?: string;
  areasForImprovement?: string;
  goals?: string;
  comments?: string;
  employeeComments?: string;
  reviewerComments?: string;
  managerSignedDate?: string;
  employeeSignedDate?: string;
  // Additional rating properties used in components
  technicalSkillsRating?: RatingScale;
  communicationRating?: RatingScale;
  teamworkRating?: RatingScale;
  leadershipRating?: RatingScale;
  initiativeRating?: RatingScale;
  achievements?: string;
}

export interface CreatePerformanceReviewDTO {
  employeeId: string;
  reviewerId?: string;
  reviewType: ReviewType;
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  reviewDate?: string;
  dueDate?: string;
}

export interface UpdatePerformanceReviewDTO extends Partial<CreatePerformanceReviewDTO> {
  status?: ReviewStatus;
  overallRating?: RatingScale;
  strengths?: string;
  areasForImprovement?: string;
  goals?: string;
  comments?: string;
  employeeComments?: string;
  reviewerComments?: string;
}

export interface PerformanceReviewFilters {
  employeeId?: string;
  reviewerId?: string;
  reviewType?: ReviewType;
  status?: ReviewStatus;
  periodStart?: string;
  periodEnd?: string;
}

// Goal types
export interface Goal extends AuditFields {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName?: string;
  reviewId?: string;
  title: string;
  description?: string;
  category: GoalCategory;
  priority: GoalPriority;
  status: GoalStatus;
  targetDate?: string;
  completedDate?: string;
  progress?: number; // 0-100
  measurableCriteria?: string;
  notes?: string;
  keyResults?: string; // Key results or success metrics for the goal
}

export interface CreateGoalDTO {
  employeeId: string;
  reviewId?: string;
  title: string;
  description?: string;
  category: GoalCategory;
  priority: GoalPriority;
  targetDate?: string;
  measurableCriteria?: string;
  notes?: string;
}

export interface UpdateGoalDTO extends Partial<CreateGoalDTO> {
  status?: GoalStatus;
  progress?: number;
  completedDate?: string;
}
