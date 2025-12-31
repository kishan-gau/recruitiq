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
  | 'ad-hoc';

export type ReviewStatus = 
  | 'draft'
  | 'in_progress'
  | 'pending_approval'
  | 'completed'
  | 'cancelled';

export type RatingScale = 1 | 2 | 3 | 4 | 5;

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
  overallRating?: RatingScale;
  strengths?: string;
  areasForImprovement?: string;
  goals?: string;
  comments?: string;
  employeeComments?: string;
  managerSignedDate?: string;
  employeeSignedDate?: string;
}

export interface CreatePerformanceReviewDTO {
  employeeId: string;
  reviewerId?: string;
  reviewType: ReviewType;
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  reviewDate?: string;
}

export interface UpdatePerformanceReviewDTO extends Partial<CreatePerformanceReviewDTO> {
  status?: ReviewStatus;
  overallRating?: RatingScale;
  strengths?: string;
  areasForImprovement?: string;
  goals?: string;
  comments?: string;
  employeeComments?: string;
}

export interface PerformanceReviewFilters {
  employeeId?: string;
  reviewerId?: string;
  reviewType?: ReviewType;
  status?: ReviewStatus;
  periodStart?: string;
  periodEnd?: string;
}
