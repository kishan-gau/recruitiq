/**
 * k6 Stress Test
 * 
 * Purpose: Find system breaking point
 * VUs: Ramp up to 150 concurrent users
 * Duration: 10 minutes
 * 
 * Run: npm run test:load:stress
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, HEADERS, THRESHOLDS, TEST_USER, SLEEP, CHECKS, TAGS } from '../config/common.js';

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Increase to 100 users
    { duration: '2m', target: 150 },  // Push to 150 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    // Relaxed thresholds for stress test
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
    'http_req_failed': ['rate<0.10'], // Allow up to 10% failure at peak stress
  },
};

export default function() {
  let token;
  
  // Login
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
    { headers: HEADERS, tags: TAGS.auth }
  );
  
  if (loginRes.status === 200 && loginRes.json('token')) {
    token = loginRes.json('token');
  } else {
    sleep(SLEEP.SHORT);
    return;
  }
  
  const authHeaders = {
    ...HEADERS,
    'Authorization': `Bearer ${token}`,
  };
  
  sleep(SLEEP.SHORT);
  
  // Heavy read operations
  group('Heavy Read Load', function() {
    // Multiple concurrent API calls
    const requests = {
      'jobs': { 
        method: 'GET', 
        url: `${BASE_URL}/api/jobs`,
        params: { headers: authHeaders, tags: TAGS.jobs }
      },
      'candidates': { 
        method: 'GET', 
        url: `${BASE_URL}/api/candidates`,
        params: { headers: authHeaders, tags: TAGS.candidates }
      },
      'workspaces': { 
        method: 'GET', 
        url: `${BASE_URL}/api/workspaces`,
        params: { headers: authHeaders, tags: TAGS.workspaces }
      },
      'user': { 
        method: 'GET', 
        url: `${BASE_URL}/api/users/me`,
        params: { headers: authHeaders, tags: TAGS.users }
      },
    };
    
    const responses = http.batch(requests);
    
    Object.values(responses).forEach(res => {
      check(res, { 'status is 2xx or 429': (r) => (r.status >= 200 && r.status < 300) || r.status === 429 });
    });
  });
  
  sleep(SLEEP.SHORT);
  
  // Write operations (creates load on database)
  group('Write Operations', function() {
    const jobData = {
      title: `Stress Test Job ${Date.now()}`,
      department: 'Engineering',
      location: 'Remote',
      employmentType: 'full-time',
      description: 'Stress test position',
      workspaceId: 'test-workspace',
    };
    
    const res = http.post(
      `${BASE_URL}/api/jobs`,
      JSON.stringify(jobData),
      { headers: authHeaders, tags: TAGS.jobs }
    );
    
    check(res, { 
      'job creation handled': (r) => r.status === 201 || r.status === 400 || r.status === 429 
    });
  });
  
  sleep(SLEEP.SHORT);
}
