/**
 * k6 Spike Test
 * 
 * Purpose: Test system resilience under sudden traffic spikes
 * VUs: Spike from 10 to 200 users suddenly
 * Duration: 3 minutes
 * 
 * Run: npm run test:load:spike
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, HEADERS, TEST_USER, SLEEP, TAGS } from '../config/common.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Normal load
    { duration: '30s', target: 200 },  // Sudden spike!
    { duration: '1m', target: 10 },    // Back to normal
    { duration: '30s', target: 200 },  // Another spike!
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // Very relaxed during spikes
    'http_req_failed': ['rate<0.15'], // Allow up to 15% failure during spike
  },
};

export default function() {
  // Simplified test to focus on system resilience
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }),
    { headers: HEADERS, tags: TAGS.auth }
  );
  
  check(res, { 
    'system responsive': (r) => r.status < 500, // Accept any non-500 error
  });
  
  if (res.status === 200 && res.json('token')) {
    const token = res.json('token');
    const authHeaders = {
      ...HEADERS,
      'Authorization': `Bearer ${token}`,
    };
    
    // Quick API call
    const jobsRes = http.get(`${BASE_URL}/api/jobs`, { 
      headers: authHeaders,
      tags: TAGS.jobs 
    });
    
    check(jobsRes, { 
      'API available': (r) => r.status < 500 || r.status === 429, // Rate limiting is OK
    });
  }
  
  sleep(SLEEP.SHORT);
}
