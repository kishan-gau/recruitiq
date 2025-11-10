/**
 * ScheduleHub Test Data Factories
 * Generates mock data for testing
 */

import { jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

export const createMockWorker = (overrides = {}) => ({
  id: uuidv4(),
  organization_id: uuidv4(),
  employee_id: uuidv4(),
  status: 'active',
  hire_date: '2024-01-01',
  termination_date: null,
  primary_department_id: uuidv4(),
  primary_location_id: uuidv4(),
  default_hourly_rate: 25.00,
  max_hours_per_week: 40,
  employment_type: 'full_time',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '555-0100',
  department_name: 'Operations',
  location_name: 'Main Office',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: uuidv4(),
  updated_by: uuidv4(),
  ...overrides
});

export const createMockRole = (overrides = {}) => ({
  id: uuidv4(),
  organization_id: uuidv4(),
  name: 'Cashier',
  code: 'CASH-01',
  description: 'Front-end cashier role',
  department_id: uuidv4(),
  required_certifications: ['Food Handler'],
  default_hourly_rate: 18.50,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: uuidv4(),
  updated_by: uuidv4(),
  ...overrides
});

export const createMockStation = (overrides = {}) => ({
  id: uuidv4(),
  organization_id: uuidv4(),
  name: 'Checkout Lane 1',
  code: 'LANE-01',
  description: 'Front checkout lane',
  location_id: uuidv4(),
  capacity: 1,
  requires_supervision: false,
  floor: 'Ground',
  zone: 'Front End',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: uuidv4(),
  updated_by: uuidv4(),
  ...overrides
});

export const createMockSchedule = (overrides = {}) => ({
  id: uuidv4(),
  organization_id: uuidv4(),
  name: 'Week of Jan 1-7',
  start_date: '2024-01-01',
  end_date: '2024-01-07',
  status: 'draft',
  published_at: null,
  notes: 'Test schedule',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: uuidv4(),
  updated_by: uuidv4(),
  ...overrides
});

export const createMockShift = (overrides = {}) => ({
  id: uuidv4(),
  organization_id: uuidv4(),
  schedule_id: uuidv4(),
  shift_date: '2024-01-01',
  start_time: '09:00',
  end_time: '17:00',
  role_id: uuidv4(),
  station_id: uuidv4(),
  worker_id: uuidv4(),
  status: 'pending',
  break_minutes: 60,
  actual_clock_in: null,
  actual_clock_out: null,
  notes: 'Test shift',
  cancellation_reason: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: uuidv4(),
  updated_by: uuidv4(),
  ...overrides
});

export const createMockAvailability = (overrides = {}) => ({
  id: uuidv4(),
  organization_id: uuidv4(),
  worker_id: uuidv4(),
  type: 'recurring',
  day_of_week: 1,
  start_time: '09:00',
  end_time: '17:00',
  start_date: null,
  end_date: null,
  priority: 'available',
  reason: 'Regular availability',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: uuidv4(),
  updated_by: uuidv4(),
  ...overrides
});

export const createMockTimeOffRequest = (overrides = {}) => ({
  id: uuidv4(),
  organization_id: uuidv4(),
  worker_id: uuidv4(),
  start_date: '2024-06-01',
  end_date: '2024-06-07',
  request_type: 'vacation',
  status: 'pending',
  reason: 'Family vacation',
  notes: 'Pre-approved',
  reviewed_at: null,
  reviewed_by: null,
  review_notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: uuidv4(),
  updated_by: uuidv4(),
  ...overrides
});

export const createMockSwapOffer = (overrides = {}) => ({
  id: uuidv4(),
  organization_id: uuidv4(),
  offered_shift_id: uuidv4(),
  offering_worker_id: uuidv4(),
  swap_type: 'open',
  target_worker_id: null,
  requested_shift_id: null,
  status: 'pending',
  reason: 'Personal commitment',
  notes: 'Any morning shift',
  approved_at: null,
  approved_by: null,
  completed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: uuidv4(),
  updated_by: uuidv4(),
  ...overrides
});

export const createMockSwapRequest = (overrides = {}) => ({
  id: uuidv4(),
  organization_id: uuidv4(),
  swap_offer_id: uuidv4(),
  requesting_worker_id: uuidv4(),
  offered_shift_id: null,
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: uuidv4(),
  updated_by: uuidv4(),
  ...overrides
});

export const createMockWorkerRole = (overrides = {}) => ({
  id: uuidv4(),
  organization_id: uuidv4(),
  worker_id: uuidv4(),
  role_id: uuidv4(),
  proficiency_level: 'competent',
  certification_date: '2024-01-01',
  notes: 'Completed training',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: uuidv4(),
  updated_by: uuidv4(),
  ...overrides
});

export const createMockStationRequirement = (overrides = {}) => ({
  id: uuidv4(),
  organization_id: uuidv4(),
  station_id: uuidv4(),
  role_id: uuidv4(),
  min_workers: 1,
  max_workers: 2,
  priority: 'required',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: uuidv4(),
  updated_by: uuidv4(),
  ...overrides
});

// Mock database pool for testing
export const createMockPool = () => ({
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn()
  })
});

// Mock request object
export const createMockRequest = (overrides = {}) => ({
  user: {
    id: uuidv4(),
    organization_id: uuidv4(),
    ...overrides.user
  },
  params: {},
  query: {},
  body: {},
  ...overrides
});

// Mock response object
export const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  };
  return res;
};

// Mock next function
export const createMockNext = () => jest.fn();
