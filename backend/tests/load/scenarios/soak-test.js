/**
 * k6 Soak Test (Endurance Test)
 * 
 * Purpose: Verify system stability over extended time (detect memory leaks)
 * VUs: 20 concurrent users
 * Duration: 30 minutes
 * 
 * Run: npm run test:load:soak
 * 
 * WARNING: This test takes 30 minutes to complete!
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, HEADERS, THRESHOLDS, TEST_USER, SLEEP, CHECKS, TAGS } from '../config/common.js';

export const options = {
  stages: [
    { duration: '2m', target: 20 },    // Ramp up to 20 users
    { duration: '26m', target: 20 },   // Stay at 20 for 26 minutes
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.05'], // Should maintain <5% failure over time
    // Check for performance degradation over time
    'http_req_duration{stage:sustained}': ['p(95)<600'], // Allow slight degradation
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
    check(loginRes, CHECKS.status200);
  } else {
    sleep(SLEEP.MEDIUM);
    return;
  }
  
  const authHeaders = {
    ...HEADERS,
    'Authorization': `Bearer ${token}`,
  };
  
  sleep(SLEEP.THINK);
  
  // Sustained realistic user behavior
  group('Realistic User Session', function() {
    // Browse jobs
    let res = http.get(`${BASE_URL}/api/jobs`, { 
      headers: authHeaders,
      tags: { ...TAGS.jobs, stage: 'sustained' }
    });
    check(res, CHECKS.statusSuccess);
    sleep(SLEEP.THINK);
    
    // View candidates
    res = http.get(`${BASE_URL}/api/candidates`, { 
      headers: authHeaders,
      tags: { ...TAGS.candidates, stage: 'sustained' }
    });
    check(res, CHECKS.statusSuccess);
    sleep(SLEEP.THINK);
    
    // Check profile
    res = http.get(`${BASE_URL}/api/users/me`, { 
      headers: authHeaders,
      tags: { ...TAGS.users, stage: 'sustained' }
    });
    check(res, CHECKS.status200);
    sleep(SLEEP.THINK);
    
    // View workspaces
    res = http.get(`${BASE_URL}/api/workspaces`, { 
      headers: authHeaders,
      tags: { ...TAGS.workspaces, stage: 'sustained' }
    });
    check(res, CHECKS.statusSuccess);
  });
  
  sleep(SLEEP.LONG);
}
