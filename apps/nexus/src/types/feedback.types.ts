/**
 * Performance Feedback Types
 * Types for the feedback system in Nexus
 */

export type FeedbackType = 'peer' | 'manager' | 'self' | '360';

export type FeedbackVisibility = 'public' | 'private' | 'anonymous';

export interface Feedback {
  id: string;
  employeeId: string;
  reviewId?: string;
  providedBy: string;
  feedbackType: FeedbackType;
  rating?: number;
  comments: string;
  visibility: FeedbackVisibility;
  createdAt: string;
  updatedAt: string;
  
  // Populated fields
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    position?: string;
    department?: string;
  };
  provider?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateFeedbackInput {
  employeeId: string;
  reviewId?: string;
  feedbackType: FeedbackType;
  rating?: number;
  comments: string;
  visibility: FeedbackVisibility;
}

export interface FeedbackFilters {
  feedbackType?: FeedbackType;
  visibility?: FeedbackVisibility;
  reviewId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface FeedbackFormData {
  employeeId: string;
  reviewId?: string;
  feedbackType: FeedbackType;
  rating?: number;
  comments: string;
  visibility: FeedbackVisibility;
}
