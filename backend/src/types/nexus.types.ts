/**
 * Nexus HRIS Type Definitions
 * Industry-standard TypeScript interfaces for HR management system
 */

// ==================== Type Literals ====================

export type LocationType = 'office' | 'warehouse' | 'retail' | 'remote' | 'other';
export type TimeOffType = 'vacation' | 'sick' | 'personal' | 'bereavement' | 'unpaid' | 'other';
export type TimeOffStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'work_from_home';
export type DepartmentStatus = 'active' | 'inactive' | 'archived';
export type ContractType = 'permanent' | 'temporary' | 'contract' | 'internship' | 'apprenticeship';
export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'renewed';
export type DocumentType = 'contract' | 'policy' | 'handbook' | 'form' | 'certificate' | 'other';
export type DocumentStatus = 'draft' | 'active' | 'archived' | 'expired';
export type PerformanceRating = 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | 'unsatisfactory';
export type PerformanceReviewStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type EmploymentHistoryStatus = 'active' | 'ended' | 'archived';

// ==================== Location Management ====================

export interface LocationData {
  id?: string;
  organization_id?: string;
  location_name: string;
  location_code?: string;
  location_type?: LocationType;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  is_active?: boolean;
  capacity?: number;
  manager_id?: string;
  timezone?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  created_at?: Date | string;
  updated_at?: Date | string;
  deleted_at?: Date | string | null;
  created_by?: string;
  updated_by?: string;
  deleted_by?: string | null;
}

// ==================== Time Off Management ====================

export interface TimeOffRequestData {
  id?: string;
  organization_id?: string;
  employee_id: string;
  time_off_type: TimeOffType;
  start_date: Date | string;
  end_date: Date | string;
  total_days?: number;
  reason?: string;
  status?: TimeOffStatus;
  approver_id?: string;
  approved_at?: Date | string | null;
  approval_notes?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  deleted_at?: Date | string | null;
  created_by?: string;
  updated_by?: string;
}

export interface TimeOffBalance {
  employee_id: string;
  time_off_type: TimeOffType;
  total_days: number;
  used_days: number;
  remaining_days: number;
  accrual_rate?: number;
  accrued_this_year?: number;
}

// ==================== Attendance Management ====================

export interface AttendanceRecordData {
  id?: string;
  organization_id?: string;
  employee_id: string;
  attendance_date: Date | string;
  clock_in_time?: Date | string;
  clock_out_time?: Date | string | null;
  clock_in_location?: string;
  clock_out_location?: string;
  clock_in_ip?: string;
  clock_out_ip?: string;
  total_hours?: number;
  break_duration?: number;
  overtime_hours?: number;
  status?: AttendanceStatus;
  notes?: string;
  approved_by?: string;
  approved_at?: Date | string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
  created_by?: string;
  updated_by?: string;
}

export interface AttendanceSummary {
  employee_id: string;
  period_start: Date | string;
  period_end: Date | string;
  total_days_present: number;
  total_days_absent: number;
  total_late_days: number;
  total_hours_worked: number;
  total_overtime_hours: number;
  average_hours_per_day: number;
}

// ==================== Department Management ====================

export interface DepartmentData {
  id?: string;
  organization_id?: string;
  department_name: string;
  department_code?: string;
  description?: string;
  parent_department_id?: string | null;
  manager_id?: string;
  cost_center?: string;
  location_id?: string;
  status?: DepartmentStatus;
  employee_count?: number;
  budget?: number;
  metadata?: Record<string, unknown>;
  created_at?: Date | string;
  updated_at?: Date | string;
  deleted_at?: Date | string | null;
  created_by?: string;
  updated_by?: string;
}

// ==================== Contract Management ====================

export interface ContractData {
  id?: string;
  organization_id?: string;
  employee_id: string;
  contract_type: ContractType;
  contract_title?: string;
  start_date: Date | string;
  end_date?: Date | string | null;
  status?: ContractStatus;
  salary?: number;
  currency?: string;
  working_hours_per_week?: number;
  notice_period_days?: number;
  probation_period_days?: number;
  benefits?: string[];
  terms_and_conditions?: string;
  signed_by_employee?: boolean;
  signed_by_employer?: boolean;
  employee_signature_date?: Date | string | null;
  employer_signature_date?: Date | string | null;
  document_url?: string;
  renewal_count?: number;
  previous_contract_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: Date | string;
  updated_at?: Date | string;
  deleted_at?: Date | string | null;
  created_by?: string;
  updated_by?: string;
}

// ==================== Document Management ====================

export interface DocumentData {
  id?: string;
  organization_id?: string;
  document_name: string;
  document_type: DocumentType;
  description?: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  version?: string;
  status?: DocumentStatus;
  effective_date?: Date | string;
  expiry_date?: Date | string | null;
  is_mandatory?: boolean;
  applies_to_department_ids?: string[];
  applies_to_employee_ids?: string[];
  requires_signature?: boolean;
  uploaded_by?: string;
  approved_by?: string;
  approved_at?: Date | string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
  created_at?: Date | string;
  updated_at?: Date | string;
  deleted_at?: Date | string | null;
  created_by?: string;
  updated_by?: string;
}

// ==================== Performance Management ====================

export interface PerformanceReviewData {
  id?: string;
  organization_id?: string;
  employee_id: string;
  reviewer_id: string;
  review_period_start: Date | string;
  review_period_end: Date | string;
  review_date?: Date | string;
  status?: PerformanceReviewStatus;
  overall_rating?: PerformanceRating;
  goals_achievements?: string;
  strengths?: string;
  areas_for_improvement?: string;
  training_recommendations?: string;
  career_development_notes?: string;
  reviewer_comments?: string;
  employee_comments?: string;
  scores?: Record<string, number>;
  next_review_date?: Date | string | null;
  metadata?: Record<string, unknown>;
  created_at?: Date | string;
  updated_at?: Date | string;
  created_by?: string;
  updated_by?: string;
}

export interface PerformanceGoal {
  id?: string;
  employee_id: string;
  title: string;
  description?: string;
  target_date: Date | string;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  progress_percentage?: number;
  achieved_date?: Date | string | null;
  notes?: string;
}

// ==================== Employment History ====================

export interface EmploymentHistoryData {
  id?: string;
  organization_id?: string;
  employee_id: string;
  position_title: string;
  department_id?: string;
  location_id?: string;
  start_date: Date | string;
  end_date?: Date | string | null;
  status?: EmploymentHistoryStatus;
  employment_type?: string;
  reporting_to?: string;
  salary?: number;
  currency?: string;
  responsibilities?: string;
  reason_for_leaving?: string;
  notes?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  created_by?: string;
  updated_by?: string;
}

// ==================== Search and Filter Interfaces ====================

export interface LocationSearchFilters {
  location_type?: LocationType;
  is_active?: boolean;
  city?: string;
  state_province?: string;
  country?: string;
  search?: string;
}

export interface TimeOffSearchFilters {
  employee_id?: string;
  time_off_type?: TimeOffType;
  status?: TimeOffStatus;
  start_date_from?: Date | string;
  start_date_to?: Date | string;
  search?: string;
}

export interface AttendanceSearchFilters {
  employee_id?: string;
  department_id?: string;
  date_from?: Date | string;
  date_to?: Date | string;
  status?: AttendanceStatus;
}

export interface DepartmentSearchFilters {
  parent_department_id?: string;
  status?: DepartmentStatus;
  location_id?: string;
  search?: string;
}
