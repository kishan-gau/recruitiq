/**
 * Type definitions for RecruitIQ Recruitment Management System
 * Industry-standard TypeScript types for jobs, applications, candidates, and interviews
 */

// Type Literals (Enums)
export type JobStatus = 'draft' | 'open' | 'paused' | 'filled' | 'closed' | 'archived' | 'on-hold' | 'cancelled';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'temporary' | 'internship';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
export type RemotePolicy = 'onsite' | 'hybrid' | 'remote';

export type ApplicationStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
export type ApplicationSource = 'website' | 'referral' | 'linkedin' | 'indeed' | 'other';

export type InterviewType = 'phone_screen' | 'video' | 'onsite' | 'technical' | 'behavioral' | 'panel' | 'final';
export type InterviewStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type InterviewDecision = 'proceed' | 'reject' | 'maybe';

export type CandidateStatus = 'new' | 'active' | 'passive' | 'hired' | 'rejected' | 'archived';
export type CandidateSource = 'website' | 'referral' | 'linkedin' | 'indeed' | 'recruiter' | 'event' | 'other';

// Job Data Interfaces
export interface JobData {
  id?: string;
  workspace_id: string;
  organization_id?: string;
  title: string;
  description: string;
  department?: string | null;
  location?: string | null;
  employment_type: EmploymentType;
  experience_level?: ExperienceLevel | string | null;
  remote_policy?: RemotePolicy | null;
  is_remote?: boolean;
  requirements?: string[] | string | null;
  responsibilities?: string[] | string | null;
  benefits?: string[] | string | null;
  skills_required?: string[];
  skills_preferred?: string[];
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string;
  status?: JobStatus;
  is_public?: boolean;
  is_published?: boolean;
  public_slug?: string | null;
  public_portal_settings?: Record<string, unknown> | null;
  flow_template_id?: string | null;
  hiring_manager_id?: string | null;
  recruiter_id?: string | null;
  posted_at?: Date | string | null;
  closes_at?: Date | string | null;
  application_deadline?: Date | string | null;
  positions_count?: number;
  remote_ok?: boolean;
  visa_sponsorship?: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
  deleted_at?: Date | string | null;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_by?: string | null;
}

// Application Data Interfaces
export interface ApplicationData {
  id?: string;
  candidate_id: string;
  job_id: string;
  organization_id?: string;
  status?: ApplicationStatus;
  cover_letter?: string | null;
  source?: ApplicationSource;
  referrer_name?: string | null;
  answers?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  notes?: string | null;
  reviewed_by?: string | null;
  applied_at?: Date | string;
  reviewed_at?: Date | string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
  deleted_at?: Date | string | null;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_by?: string | null;
}

// Interview Data Interfaces
export interface InterviewData {
  id?: string;
  application_id: string;
  organization_id?: string;
  interviewer_id: string;
  scheduled_at: Date | string;
  duration?: number; // in minutes
  interview_type: InterviewType;
  location?: string | null;
  meeting_link?: string | null;
  notes?: string | null;
  agenda?: string | null;
  status?: InterviewStatus;
  feedback?: string | null;
  rating?: number | null; // 1-5
  decision?: InterviewDecision | null;
  completed_at?: Date | string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
  deleted_at?: Date | string | null;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_by?: string | null;
}

export interface InterviewFeedbackData {
  feedback: string;
  rating: number; // 1-5
  decision: InterviewDecision;
}

export interface SchedulingConflict {
  has_conflict: boolean;
  conflicting_interview?: InterviewData;
}

// Candidate Data Interfaces
export interface CandidateData {
  id?: string;
  organization_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  resume_url?: string | null;
  status?: CandidateStatus;
  source?: CandidateSource;
  skills?: string[];
  experience_years?: number | null;
  current_company?: string | null;
  current_title?: string | null;
  desired_salary?: number | null;
  desired_salary_currency?: string;
  availability_date?: Date | string | null;
  notes?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown> | null;
  created_at?: Date | string;
  updated_at?: Date | string;
  deleted_at?: Date | string | null;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_by?: string | null;
}

// Search and Filter Interfaces
export interface JobSearchFilters {
  status?: JobStatus | JobStatus[];
  employment_type?: EmploymentType | EmploymentType[];
  location?: string;
  remote_policy?: RemotePolicy;
  department?: string;
  salary_min?: number;
  salary_max?: number;
  is_published?: boolean;
  hiring_manager_id?: string;
  search?: string;
  page?: number;
  per_page?: number;
  order_by?: string;
  order_direction?: 'asc' | 'desc';
}

export interface ApplicationSearchFilters {
  status?: ApplicationStatus | ApplicationStatus[];
  job_id?: string;
  candidate_id?: string;
  source?: ApplicationSource;
  date_from?: Date | string;
  date_to?: Date | string;
  search?: string;
  page?: number;
  per_page?: number;
  order_by?: string;
  order_direction?: 'asc' | 'desc';
}

export interface CandidateSearchFilters {
  status?: CandidateStatus | CandidateStatus[];
  source?: CandidateSource;
  skills?: string[];
  experience_min?: number;
  experience_max?: number;
  location?: string;
  search?: string;
  page?: number;
  per_page?: number;
  order_by?: string;
  order_direction?: 'asc' | 'desc';
}

// Pagination Response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// Statistics Interfaces
export interface JobStatistics {
  total_applications: number;
  applications_by_status: Record<ApplicationStatus, number>;
  applications_by_source: Record<ApplicationSource, number>;
  average_time_to_hire?: number; // in days
  time_to_first_response?: number; // in hours
}

export interface RecruitmentMetrics {
  total_jobs: number;
  open_jobs: number;
  total_applications: number;
  total_candidates: number;
  total_interviews: number;
  applications_this_month: number;
  hire_rate: number; // percentage
  average_time_to_hire: number; // in days
}
