/**
 * Performance Types
 * TypeScript definitions for performance reviews and goals
 */

// ============ Performance Review Types ============

export type ReviewStatus = 'draft' | 'pending' | 'in-progress' | 'completed' | 'cancelled';
export type ReviewType = 'annual' | 'mid-year' | 'quarterly' | 'probation' | '360' | 'project';
export type ReviewRating = 1 | 2 | 3 | 4 | 5;

export interface PerformanceReview {
  id: string;
  organizationId: string;
  employeeId: string;
  reviewerId: string;
  reviewType: ReviewType;
  status: ReviewStatus;
  
  // Review Period
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  dueDate: string;
  completedDate?: string;
  
  // Ratings
  overallRating?: ReviewRating;
  technicalSkillsRating?: ReviewRating;
  communicationRating?: ReviewRating;
  teamworkRating?: ReviewRating;
  leadershipRating?: ReviewRating;
  initiativeRating?: ReviewRating;
  
  // Comments
  strengths?: string;
  areasForImprovement?: string;
  achievements?: string;
  goals?: string;
  reviewerComments?: string;
  employeeComments?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Populated fields
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeNumber: string;
    jobTitle?: string;
    departmentId?: string;
    department?: {
      id: string;
      departmentName: string;
    };
  };
  reviewer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreatePerformanceReviewDTO {
  employeeId: string;
  reviewerId: string;
  reviewType: ReviewType;
  reviewPeriodStart: string;
  reviewPeriodEnd: string;
  dueDate: string;
}

export interface UpdatePerformanceReviewDTO {
  reviewerId?: string;
  status?: ReviewStatus;
  dueDate?: string;
  overallRating?: ReviewRating;
  technicalSkillsRating?: ReviewRating;
  communicationRating?: ReviewRating;
  teamworkRating?: ReviewRating;
  leadershipRating?: ReviewRating;
  initiativeRating?: ReviewRating;
  strengths?: string;
  areasForImprovement?: string;
  achievements?: string;
  goals?: string;
  reviewerComments?: string;
  employeeComments?: string;
  completedDate?: string;
}

export interface PerformanceReviewFilters {
  employeeId?: string;
  reviewerId?: string;
  status?: ReviewStatus;
  reviewType?: ReviewType;
  startDate?: string;
  endDate?: string;
}

// ============ Goal Types ============

export type GoalStatus = 'draft' | 'active' | 'completed' | 'cancelled' | 'overdue';
export type GoalPriority = 'low' | 'medium' | 'high' | 'critical';
export type GoalCategory = 'performance' | 'development' | 'project' | 'behavior' | 'other';

export interface Goal {
  id: string;
  organizationId: string;
  employeeId: string;
  title: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;
  status: GoalStatus;
  
  // Timeline
  startDate: string;
  targetDate: string;
  completedDate?: string;
  
  // Progress
  progress: number; // 0-100
  
  // Key Results / Milestones
  keyResults?: string;
  
  // Alignment
  alignedToReviewId?: string;
  parentGoalId?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  
  // Populated fields
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeNumber: string;
    jobTitle?: string;
    departmentId?: string;
    department?: {
      id: string;
      departmentName: string;
    };
  };
  review?: {
    id: string;
    reviewType: ReviewType;
    reviewPeriodEnd: string;
  };
}

export interface CreateGoalDTO {
  employeeId: string;
  title: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;
  startDate: string;
  targetDate: string;
  keyResults?: string;
  alignedToReviewId?: string;
  parentGoalId?: string;
}

export interface UpdateGoalDTO {
  title?: string;
  description?: string;
  category?: GoalCategory;
  priority?: GoalPriority;
  status?: GoalStatus;
  startDate?: string;
  targetDate?: string;
  progress?: number;
  keyResults?: string;
  completedDate?: string;
}

export interface GoalFilters {
  employeeId?: string;
  status?: GoalStatus;
  category?: GoalCategory;
  priority?: GoalPriority;
  alignedToReviewId?: string;
}

// ============ Statistics & Analytics ============

export interface ReviewStatistics {
  totalReviews: number;
  completedReviews: number;
  pendingReviews: number;
  overdueReviews: number;
  averageRating: number;
  ratingDistribution: {
    rating: ReviewRating;
    count: number;
  }[];
}

export interface GoalStatistics {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  overdueGoals: number;
  averageProgress: number;
  completionRate: number;
}
