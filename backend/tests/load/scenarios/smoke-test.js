/**
 * k6 Smoke Test
 * 
 * Purpose: Verify basic functionality under minimal load
 * VUs: 2
 * Duration: 1 minute
 * 
 * Run: npm run test:load:smoke
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, HEADERS, THRESHOLDS, TEST_USER, SLEEP, CHECKS, TAGS } from '../config/common.js';

export const options = {
  vus: 2,
  duration: '1m',
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_failed': ['rate<0.05'], // Less than 5% failure rate
    // Smoke test doesn't need high throughput, just verify functionality
  },
};

export default function() {
  // Test 1: Health Check
  let res = http.get(`${BASE_URL}/health`, { tags: TAGS.auth });
  check(res, CHECKS.status200);
  sleep(SLEEP.SHORT);

  // Test 2: Tenant Login
  res = http.post(
    `${BASE_URL}/api/auth/tenant/login`,
    JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
    { headers: HEADERS, tags: TAGS.auth }
  );
  
  const loginSuccess = check(res, {
    'login successful': (r) => r.status === 200,
  });
  
  if (res.status === 200) {
    // Cookie-based authentication - cookies are automatically handled by k6
    // No need to extract token, k6 maintains cookies across requests
    
    sleep(SLEEP.THINK);
    
    // Test 3: Get User Profile
    res = http.get(`${BASE_URL}/api/auth/tenant/me`, { 
      headers: HEADERS,
      tags: TAGS.users 
    });
    check(res, {
      'profile endpoint accessible': (r) => r.status === 200
    });
    sleep(SLEEP.SHORT);
    
    // Test 4: Get Employees (Nexus product endpoint)
    res = http.get(`${BASE_URL}/api/products/nexus/employees`, { 
      headers: HEADERS,
      tags: TAGS.workspaces 
    });
    check(res, {
      'employees endpoint accessible': (r) => r.status === 200
    });
    sleep(SLEEP.SHORT);
    
    // Test 5: Get PayLinQ Dashboard (PayLinQ product endpoint)
    res = http.get(`${BASE_URL}/api/products/paylinq/dashboard`, { 
      headers: HEADERS,
      tags: TAGS.jobs 
    });
    check(res, {
      'paylinq dashboard accessible': (r) => r.status === 200
    });
  }
  
  sleep(SLEEP.MEDIUM);
}
