# Load Testing Guide

## Overview

This directory contains **industry-standard load tests** using **k6** (by Grafana Labs), the most widely adopted modern load testing tool.

### Why k6?

- ✅ **Industry Standard**: Used by Microsoft, GitHub, Shopify, and thousands of companies
- ✅ **Modern**: Built for microservices, APIs, and cloud-native applications
- ✅ **Developer-Friendly**: JavaScript/ES6 scripting
- ✅ **Cloud Integration**: Native support for Grafana Cloud k6, AWS, Azure
- ✅ **CI/CD Ready**: Easy integration with GitHub Actions, Jenkins, GitLab CI
- ✅ **Comprehensive Metrics**: Built-in performance metrics and thresholds

## Installation

### Windows (Recommended)

```powershell
# Using Chocolatey
choco install k6

# Or using winget
winget install k6
```

### Linux/Mac

```bash
# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Mac
brew install k6
```

**Verify Installation**:
```bash
k6 version
```

## Quick Start

### Prerequisites (One-Time Setup)

**Important**: Before running load tests, set up the test user account:

```powershell
cd C:\RecruitIQ\backend
node scripts/setup-loadtest-user.js
```

This script:
- ✅ Creates the `loadtest@recruitiq.com` user account
- ✅ Unlocks the account (clears failed login attempts)
- ✅ Clears Redis lockout data
- ✅ Prepares the system for load testing

**Run this again if tests fail with 401 errors** (account locked).

### 1. Start the Backend Server (Load Test Mode)

```powershell
cd C:\RecruitIQ\backend
npm run start:loadtest
```

Wait for: `Server running on port 4000`

**⚠️ Important**: Use `npm run start:loadtest` instead of `npm start`. This enables `LOAD_TEST=true` which increases rate limits 1000x to prevent blocking during tests.

### 2. Run Load Tests

Open a **new terminal**:

```powershell
cd C:\RecruitIQ\backend

# Smoke test (validate functionality)
npm run test:load:smoke

# Load test (normal traffic)
npm run test:load

# Stress test (breaking point)
npm run test:load:stress

# Spike test (sudden traffic surge)
npm run test:load:spike

# Soak test (stability over time)
npm run test:load:soak
```

## Test Types

### 1. Smoke Test (2 VUs, 1 minute)
**Purpose**: Validate basic functionality under minimal load

```powershell
npm run test:load:smoke
```

### 2. Load Test (50 VUs, 5 minutes)
**Purpose**: Test normal expected traffic

```powershell
npm run test:load
```

### 3. Stress Test (100+ VUs, 10 minutes)
**Purpose**: Find breaking point and system limits

```powershell
npm run test:load:stress
```

### 4. Spike Test (Variable VUs, 3 minutes)
**Purpose**: Test system behavior under sudden traffic spikes

```powershell
npm run test:load:spike
```

### 5. Soak Test (20 VUs, 30 minutes)
**Purpose**: Verify system stability over extended time

```powershell
npm run test:load:soak
```

## Test Scenarios

All tests cover critical API endpoints:

- 🔐 **Authentication**: `/api/auth/login`, `/api/auth/register`
- 👤 **Users**: `/api/users/me`
- 💼 **Jobs**: `/api/jobs` (GET, POST)
- 👥 **Candidates**: `/api/candidates` (GET, POST)
- 📊 **Workspaces**: `/api/workspaces`

## Performance Thresholds

Our tests enforce these industry-standard SLAs:

| Metric | Target | Critical |
|--------|--------|----------|
| **Response Time (p95)** | < 500ms | < 1000ms |
| **Response Time (p99)** | < 1000ms | < 2000ms |
| **Success Rate** | > 95% | > 90% |
| **Request Rate** | > 100 req/s | > 50 req/s |

## Reading Results

### Key Metrics

```
http_req_duration..............: avg=245ms min=89ms med=223ms max=1.2s p(95)=456ms p(99)=789ms
http_req_failed................: 0.00%   ✓ 0       ✗ 15234
http_reqs......................: 15234   253.9/s
vus............................: 50      min=0      max=50
```

**What to look for**:
- ✅ `http_req_failed`: Should be < 5%
- ✅ `p(95)`: 95th percentile should be < 500ms
- ✅ `p(99)`: 99th percentile should be < 1000ms
- ✅ `http_reqs`: Requests per second

### Threshold Violations

```
✗ 95% of requests should be below 500ms
  ↳  51% — ✓ 7789 / ✗ 7445
```

This means **system is under stress** and needs optimization.

## Best Practices

### 1. Test Environment

- 🔴 **Never run against production**
- ✅ Use dedicated test/staging environment
- ✅ Ensure database is populated with test data
- ✅ Use production-like infrastructure

### 2. Test Progression

Follow this order:

1. **Smoke Test** → Verify basic functionality
2. **Load Test** → Test normal load
3. **Stress Test** → Find limits
4. **Spike Test** → Test resilience
5. **Soak Test** → Check for memory leaks

### 3. Interpreting Results

**Good Performance**:
```
http_req_duration: avg=150ms p(95)=300ms p(99)=500ms
http_req_failed: 0.00%
```

**Degraded Performance**:
```
http_req_duration: avg=800ms p(95)=1.5s p(99)=3s
http_req_failed: 2.3%
```

**System Failure**:
```
http_req_duration: avg=5s p(95)=10s p(99)=15s
http_req_failed: 45%
```

## Optimization Tips

If tests fail or perform poorly:

### 1. Database Optimization
- Add indexes to frequently queried columns
- Use connection pooling
- Optimize slow queries

### 2. Caching
- Implement Redis caching
- Cache expensive database queries
- Use HTTP caching headers

### 3. Rate Limiting
- Configure rate limits appropriately
- Use Redis-backed rate limiting

### 4. Infrastructure
- Scale horizontally (more instances)
- Increase CPU/memory resources
- Use load balancer

### 5. Code Optimization
- Reduce N+1 queries
- Optimize middleware
- Use async operations

## CI/CD Integration

### GitHub Actions

```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: grafana/setup-k6-action@v1
      - name: Run k6 load test
        run: k6 run tests/load/scenarios/load-test.js
```

## Monitoring & Reporting

### Export Results

```powershell
# JSON output
k6 run --out json=results.json tests/load/scenarios/load-test.js

# CSV output
k6 run --out csv=results.csv tests/load/scenarios/load-test.js

# InfluxDB (for Grafana)
k6 run --out influxdb=http://localhost:8086/k6 tests/load/scenarios/load-test.js
```

### Grafana Cloud k6

For enterprise-grade monitoring:

```powershell
k6 cloud run tests/load/scenarios/load-test.js
```

## Troubleshooting

### Login Failures (401 Unauthorized)

**Problem**: Tests fail with "Account temporarily locked" errors

**Solution**: Run the setup script to clear lockouts:
```powershell
node scripts/setup-loadtest-user.js
```

This clears both database and Redis lockout data for the test user.

### Rate Limiting Errors (429 Too Many Requests)

**Problem**: Tests fail with rate limit exceeded errors

**Solution**: Ensure you started the server with `npm run start:loadtest` (not `npm start`)

If the server is already running with the wrong mode:
```powershell
# Stop the server
Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess | Stop-Process -Force

# Start in load test mode
npm run start:loadtest
```

### Port Already in Use

```powershell
# Kill process on port 4000
Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess | Stop-Process -Force
```

### Memory Issues

For soak tests, monitor memory:

```powershell
# Windows
Get-Process node | Select-Object ProcessName, @{Name='MemoryMB';Expression={$_.WS / 1MB}}
```

## Advanced Usage

### Custom Scenarios

Create your own test in `tests/load/scenarios/`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function() {
  const res = http.get('http://localhost:4000/api/your-endpoint');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

### Environment Variables

```powershell
$env:BASE_URL = 'https://staging.recruitiq.com'
k6 run tests/load/scenarios/load-test.js
```

## Resources

- 📖 [k6 Documentation](https://k6.io/docs/)
- 📊 [k6 Cloud](https://app.k6.io/)
- 🎓 [k6 Best Practices](https://k6.io/docs/testing-guides/load-testing-best-practices/)
- 💬 [k6 Community Forum](https://community.k6.io/)

## Support

For questions about load testing:
- Check test output and logs
- Review performance metrics
- Consult k6 documentation
- Open issue in project repository

---

**Last Updated**: October 31, 2025  
**k6 Version**: Latest (install from official sources)  
**Test Coverage**: 5 test types, 6 critical endpoints
