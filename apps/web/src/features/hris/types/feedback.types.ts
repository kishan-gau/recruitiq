/**
 * Feedback types for HRIS performance feedback management
 */

import type { AuditFields } from '../../../types/common.types';

export type FeedbackType = 
  | 'positive'
  | 'constructive'
  | 'coaching'
  | 'recognition'
  | 'development';

export type FeedbackStatus = 
  | 'draft'
  | 'submitted'
  | 'acknowledged'
  | 'archived';

export type FeedbackVisibility = 
  | 'private'
  | 'manager'
  | 'team'
  | 'public';

export interface Feedback extends AuditFields {
  id: string;
  organizationId: string;
  employeeId: string;
  employeeName?: string;
  reviewerId: string;
  reviewerName?: string;
  feedbackType: FeedbackType;
  status: FeedbackStatus;
  subject?: string;
  content: string;
  category?: string;
  isAnonymous?: boolean;
  acknowledgedAt?: string;
  relatedReviewId?: string;
  tags?: string[];
  // Additional properties used in components
  visibility?: FeedbackVisibility;
  rating?: number;
  comments?: string;
  providedByName?: string;
}

export interface CreateFeedbackDTO {
  employeeId: string;
  reviewerId: string;
  feedbackType: FeedbackType;
  subject?: string;
  content: string;
  category?: string;
  isAnonymous?: boolean;
  relatedReviewId?: string;
  tags?: string[];
}

export interface UpdateFeedbackDTO extends Partial<CreateFeedbackDTO> {
  status?: FeedbackStatus;
  acknowledgedAt?: string;
}

export interface FeedbackFilters {
  employeeId?: string;
  reviewerId?: string;
  feedbackType?: FeedbackType;
  status?: FeedbackStatus;
  dateFrom?: string;
  dateTo?: string;
}
