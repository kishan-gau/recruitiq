/**
 * Common k6 Load Test Configuration
 * Industry-standard thresholds and settings
 */

// Base URL - can be overridden by environment variable
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

// Common headers for all requests
export const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Industry-standard performance thresholds
export const THRESHOLDS = {
  // Response time thresholds (95% of requests)
  'http_req_duration': ['p(95)<500', 'p(99)<1000'],
  
  // Success rate threshold
  'http_req_failed': ['rate<0.05'], // Less than 5% failure rate
  
  // Request rate (for load tests)
  'http_reqs': ['rate>50'], // At least 50 requests per second
};

// Strict thresholds for production readiness
export const STRICT_THRESHOLDS = {
  'http_req_duration': ['p(95)<300', 'p(99)<500'],
  'http_req_failed': ['rate<0.01'], // Less than 1% failure rate
  'http_reqs': ['rate>100'],
};

// Test data
export const TEST_USER = {
  email: 'loadtest@recruitiq.com',
  password: 'LoadTest123!@#',
  name: 'Load Test User',
};

export const TEST_CANDIDATE = {
  name: 'Load Test Candidate',
  email: 'candidate@loadtest.com',
  phone: '+1234567890',
  source: 'load-test',
};

export const TEST_JOB = {
  title: 'Load Test Position',
  department: 'Engineering',
  location: 'Remote',
  employmentType: 'full-time',
  description: 'Load testing position',
};

// Sleep durations (realistic user behavior)
export const SLEEP = {
  SHORT: 1,    // 1 second
  MEDIUM: 3,   // 3 seconds
  LONG: 5,     // 5 seconds
  THINK: 2,    // 2 seconds - user thinking time
};

// Virtual User (VU) configurations for different test types
export const VU_CONFIG = {
  smoke: {
    vus: 2,
    duration: '1m',
  },
  load: {
    vus: 50,
    duration: '5m',
  },
  stress: {
    stages: [
      { duration: '2m', target: 50 },   // Ramp up to 50 users
      { duration: '5m', target: 100 },  // Ramp up to 100 users
      { duration: '2m', target: 150 },  // Ramp up to 150 users
      { duration: '1m', target: 0 },    // Ramp down to 0 users
    ],
  },
  spike: {
    stages: [
      { duration: '30s', target: 10 },   // Normal load
      { duration: '30s', target: 200 },  // Sudden spike
      { duration: '1m', target: 10 },    // Back to normal
      { duration: '30s', target: 200 },  // Another spike
      { duration: '30s', target: 0 },    // Ramp down
    ],
  },
  soak: {
    stages: [
      { duration: '2m', target: 20 },    // Ramp up
      { duration: '26m', target: 20 },   // Stay at 20 for 26 minutes
      { duration: '2m', target: 0 },     // Ramp down
    ],
  },
};

// Check configurations
export const CHECKS = {
  status200: { 'status is 200': (r) => r.status === 200 },
  status201: { 'status is 201': (r) => r.status === 201 },
  statusSuccess: { 'status is 2xx': (r) => r.status >= 200 && r.status < 300 },
  hasData: { 'has response data': (r) => r.body.length > 0 },
  jsonResponse: { 'is JSON': (r) => {
    try {
      JSON.parse(r.body);
      return true;
    } catch (e) {
      return false;
    }
  }},
};

// Custom tags for metrics grouping
export const TAGS = {
  auth: { name: 'auth' },
  jobs: { name: 'jobs' },
  candidates: { name: 'candidates' },
  users: { name: 'users' },
  workspaces: { name: 'workspaces' },
};
