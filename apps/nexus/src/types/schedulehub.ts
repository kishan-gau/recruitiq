export interface Worker {
  id: string;
  organization_id: string;
  employee_id: string;
  status: 'active' | 'inactive' | 'terminated';
  hire_date: string;
  termination_date?: string;
  base_hourly_rate?: number;
  overtime_rate?: number;
  weekly_hours_limit?: number;
  max_consecutive_days?: number;
  min_rest_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  color_code?: string;
  isActive: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkerRole {
  id: string;
  worker_id: string;
  role_id: string;
  proficiency_level: 'trainee' | 'competent' | 'proficient' | 'expert';
  certifications?: any;
  is_primary: boolean;
  assigned_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Station {
  id: string;
  organization_id: string;
  location_id?: string;
  department_id?: string;
  name: string;
  description?: string;
  capacity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StationRequirement {
  id: string;
  station_id: string;
  role_id: string;
  min_workers: number;
  max_workers?: number;
  required_proficiency?: 'trainee' | 'competent' | 'proficient' | 'expert';
  priority_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  organization_id: string;
  department_id?: string;
  location_id?: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  published_by?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  scheduleId: string;
  employeeId?: string;
  roleId?: string;
  stationId?: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  breakDurationMinutes?: number;
  breakPaid?: boolean;
  shiftType?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  createdAt: string;
  updatedAt: string;
  
  // Nested objects from JOINs (DTO transformed)
  worker?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber?: string;
  };
  role?: {
    id: string;
    name: string;
    color?: string;
  };
  station?: {
    id: string;
    name: string;
  };
}

export interface Availability {
  id: string;
  worker_id: string;
  availability_type: 'recurring' | 'one_time' | 'unavailable';
  day_of_week?: number;
  start_date?: string;
  end_date?: string;
  start_time: string;
  end_time: string;
  priority_level: 'preferred' | 'available' | 'unavailable';
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeOffRequest {
  id: string;
  worker_id: string;
  request_type: 'vacation' | 'sick' | 'personal' | 'unpaid' | 'other';
  start_date: string;
  end_date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'denied' | 'cancelled';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftSwapOffer {
  id: string;
  offered_shift_id: string;
  offering_worker_id: string;
  swap_type: 'open' | 'direct' | 'trade';
  target_worker_id?: string;
  requested_shift_id?: string;
  status:
    | 'pending'
    | 'accepted'
    | 'approved'
    | 'declined'
    | 'cancelled'
    | 'expired'
    | 'completed';
  expires_at?: string;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftSwapRequest {
  id: string;
  offer_id: string;
  requesting_worker_id: string;
  offered_shift_id?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  accepted_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Form types
export interface CreateWorkerForm {
  employee_id: string;
  hire_date: string;
  base_hourly_rate?: number;
  overtime_rate?: number;
  weekly_hours_limit?: number;
  max_consecutive_days?: number;
  min_rest_hours?: number;
}

export interface CreateScheduleForm {
  name: string;
  department_id?: string;
  location_id?: string;
  start_date: string;
  end_date: string;
  notes?: string;
}

export interface CreateShiftForm {
  schedule_id?: string;
  assigned_worker_id?: string;
  role_id?: string;
  station_id?: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_duration_minutes?: number;
  notes?: string;
}

export interface CreateAvailabilityForm {
  worker_id?: string;
  availability_type: 'recurring' | 'one_time' | 'unavailable';
  day_of_week?: number;
  start_date?: string;
  end_date?: string;
  start_time: string;
  end_time: string;
  priority_level: 'preferred' | 'available' | 'unavailable';
  notes?: string;
}

export interface CreateTimeOffRequestForm {
  worker_id?: string;
  request_type: 'vacation' | 'sick' | 'personal' | 'unpaid' | 'other';
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface CreateSwapOfferForm {
  offered_shift_id: string;
  swap_type: 'open' | 'direct' | 'trade';
  target_worker_id?: string;
  requested_shift_id?: string;
  notes?: string;
}

export interface CreateRoleForm {
  name: string;
  description?: string;
  color_code?: string;
}

export interface CreateStationForm {
  name: string;
  description?: string;
  location_id?: string;
  department_id?: string;
  capacity?: number;
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ScheduleWithShifts extends Schedule {
  shifts: Shift[];
}

export interface WorkerWithRoles extends Worker {
  roles: (WorkerRole & { role: Role })[];
}

export interface AvailabilityCheckResult {
  available: boolean;
  conflicts?: Availability[];
}

export interface DashboardStats {
  activeWorkers: number;
  publishedSchedules: number;
  pendingTimeOff: number;
  openShifts: number;
  upcomingShifts: Shift[];
  pendingApprovals: TimeOffRequest[];
}
