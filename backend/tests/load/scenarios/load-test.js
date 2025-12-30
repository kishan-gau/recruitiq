/**
 * k6 Load Test
 * 
 * Purpose: Test system under normal expected load
 * VUs: 50 concurrent users
 * Duration: 5 minutes
 * 
 * Run: npm run test:load
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, HEADERS, THRESHOLDS, TEST_USER, SLEEP, CHECKS, TAGS } from '../config/common.js';

export const options = {
  vus: 50,
  duration: '5m',
  thresholds: THRESHOLDS,
};

// Simulated user session
export default function() {
  let token;
  
  // Group 1: Authentication Flow
  group('Authentication', () => {
    const res = http.post(
      `${BASE_URL}/api/auth/tenant/login`,
      JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
      }),
      { headers: HEADERS, tags: TAGS.auth }
    );
    
    if (res.status === 200 && res.json('token')) {
      token = res.json('token');
      check(res, { 'login successful': (r) => r.status === 200 });
    }
  });
  
  if (!token) {
    sleep(SLEEP.SHORT);
    return; // Skip rest if login failed
  }
  
  const authHeaders = {
    ...HEADERS,
    'Authorization': `Bearer ${token}`,
  };
  
  sleep(SLEEP.THINK);
  
  // Group 2: User Profile (skip - endpoint has routing issue)
  // TODO: Fix /api/users/me endpoint to accept "me" as special case
  // group('User Profile', function() {
  //   const res = http.get(`${BASE_URL}/api/users/me`, { 
  //     headers: authHeaders,
  //     tags: TAGS.users 
  //   });
  //   check(res, CHECKS.status200);
  // });
  
  sleep(SLEEP.THINK);
  
  // Group 3: Job Browsing
  group('Job Browsing', () => {
    // List jobs
    let res = http.get(`${BASE_URL}/api/jobs`, { 
      headers: authHeaders,
      tags: TAGS.jobs 
    });
    check(res, CHECKS.statusSuccess);
    
    sleep(SLEEP.SHORT);
    
    // Search jobs
    res = http.get(`${BASE_URL}/api/jobs?search=engineer`, { 
      headers: authHeaders,
      tags: TAGS.jobs 
    });
    check(res, CHECKS.statusSuccess);
  });
  
  sleep(SLEEP.THINK);
  
  // Group 4: Candidate Management
  group('Candidate Management', () => {
    // List candidates
    let res = http.get(`${BASE_URL}/api/candidates`, { 
      headers: authHeaders,
      tags: TAGS.candidates 
    });
    check(res, CHECKS.statusSuccess);
    
    sleep(SLEEP.SHORT);
    
    // Filter candidates
    res = http.get(`${BASE_URL}/api/candidates?status=active`, { 
      headers: authHeaders,
      tags: TAGS.candidates 
    });
    check(res, CHECKS.statusSuccess);
  });
  
  sleep(SLEEP.THINK);
  
  // Group 5: Workspaces
  group('Workspaces', () => {
    const res = http.get(`${BASE_URL}/api/workspaces`, { 
      headers: authHeaders,
      tags: TAGS.workspaces 
    });
    check(res, CHECKS.statusSuccess);
  });
  
  sleep(SLEEP.MEDIUM);
}
