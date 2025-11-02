# Load Testing Setup - Installation & Quick Start

## ✅ Installation Complete

**k6 v1.3.0** has been successfully installed!

## What is k6?

**k6** is the **industry-standard** load testing tool created by Grafana Labs. It's used by:
- ✅ Microsoft
- ✅ GitHub
- ✅ Shopify  
- ✅ Adobe
- ✅ GitLab
- ✅ And thousands of other companies worldwide

### Why k6 is Industry Standard:

1. **Modern & Developer-Friendly**: JavaScript/ES6 scripting
2. **Cloud-Native**: Built for microservices and APIs
3. **Comprehensive Metrics**: Real-time performance insights
4. **CI/CD Integration**: Works with GitHub Actions, Jenkins, GitLab CI
5. **Enterprise-Ready**: Used in production by Fortune 500 companies
6. **Free & Open Source**: Apache 2.0 licensed

## Quick Start Guide

### 1. Setup Load Test User (One-Time Setup)

**Run this first** to create the test user and clear any lockouts:

```powershell
cd C:\RecruitIQ\backend
node scripts/setup-loadtest-user.js
```

You should see:
```
✅ Connected to Redis
🔍 Checking for load test user...
✅ User exists (or created)
✅ Account unlocked in database
✅ Cleared X Redis lockout keys
✅ Load test user ready for testing
```

**Note:** Run this script again if load tests start failing with 401 errors (account locked).

### 2. Start Your Backend Server (Load Test Mode)

```powershell
cd C:\RecruitIQ\backend
npm run start:loadtest
```

Wait for: `✅ Server running on port 4000`

**Important:** Use `npm run start:loadtest` instead of `npm start`. This sets `LOAD_TEST=true` which increases rate limits 1000x to avoid blocking during load tests.

### 3. Run Your First Load Test

Open a **new terminal** and run:

```powershell
cd C:\RecruitIQ\backend

# Smoke test (2 users, 1 minute) - Start here!
npm run test:load:smoke
```

## Available Test Types

| Test Type | Command | VUs | Duration | Purpose |
|-----------|---------|-----|----------|---------|
| **Smoke** | `npm run test:load:smoke` | 2 | 1 min | Verify basic functionality |
| **Load** | `npm run test:load` | 50 | 5 min | Normal traffic simulation |
| **Stress** | `npm run test:load:stress` | 50→150 | 10 min | Find breaking point |
| **Spike** | `npm run test:load:spike` | 10→200 | 3 min | Sudden traffic surge |
| **Soak** | `npm run test:load:soak` | 20 | 30 min | Stability & memory leaks |

### Recommended Test Order

```powershell
# 1. Start with smoke test
npm run test:load:smoke

# 2. If smoke test passes, run load test
npm run test:load

# 3. Then push it harder with stress test
npm run test:load:stress

# 4. Test resilience with spike test
npm run test:load:spike

# 5. Finally, check long-term stability (30 min)
npm run test:load:soak
```

## Understanding Results

### ✅ Good Performance Example

```
checks.........................: 100.00% ✓ 12500      ✗ 0
http_req_duration..............: avg=145ms  min=45ms  med=130ms  max=340ms  p(95)=280ms  p(99)=310ms
http_req_failed................: 0.00%   ✓ 0          ✗ 12500
http_reqs......................: 12500   208.33/s
iterations.....................: 2500    41.66/s
```

**Interpretation**:
- ✅ 0% failure rate
- ✅ p95 response time: 280ms (< 500ms target)
- ✅ p99 response time: 310ms (< 1000ms target)
- ✅ 208 requests/second

### ⚠️ Warning Signs

```
checks.........................: 95.00%  ✓ 11875      ✗ 625
http_req_duration..............: avg=780ms  min=120ms  med=650ms  max=3.2s  p(95)=1.8s  p(99)=2.5s
http_req_failed................: 5.00%   ✓ 625        ✗ 11875
```

**Problems**:
- ⚠️ 5% failure rate (threshold)
- ⚠️ p95: 1.8s (above 500ms target)
- ⚠️ High variability (max 3.2s)

### ❌ System Failure

```
checks.........................: 78.00%  ✓ 9750       ✗ 2750
http_req_duration..............: avg=4.2s   min=890ms  med=3.8s  max=12s  p(95)=8.5s  p(99)=10s
http_req_failed................: 22.00%  ✓ 2750       ✗ 9750
```

**Critical Issues**:
- ❌ 22% failure rate
- ❌ p95: 8.5s (way above 500ms target)
- ❌ System is overloaded

## Key Metrics Explained

| Metric | What It Means | Target |
|--------|---------------|--------|
| **http_req_duration (p95)** | 95% of requests complete within this time | < 500ms |
| **http_req_duration (p99)** | 99% of requests complete within this time | < 1000ms |
| **http_req_failed** | % of failed requests | < 5% |
| **http_reqs** | Requests per second | > 50/s |
| **checks** | % of validation checks passed | 100% |

### What is p95 and p99?

- **p95 (95th percentile)**: 95 out of 100 users experience this speed or better
- **p99 (99th percentile)**: 99 out of 100 users experience this speed or better

**Industry standard**: Most companies optimize for p95 < 500ms

## Test Coverage

All tests exercise these critical endpoints:

| Endpoint | Method | Test Coverage |
|----------|--------|---------------|
| `/api/auth/login` | POST | ✅ All tests |
| `/api/auth/register` | POST | ✅ Stress test |
| `/api/users/me` | GET | ✅ All tests |
| `/api/jobs` | GET, POST | ✅ All tests |
| `/api/candidates` | GET, POST | ✅ All tests |
| `/api/workspaces` | GET | ✅ All tests |

## Performance Optimization Tips

If tests fail or show poor performance:

### 1. Database
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_jobs_workspace_id ON jobs(workspace_id);
CREATE INDEX idx_candidates_email ON candidates(email);
```

### 2. Caching
```javascript
// Implement Redis caching for expensive queries
const cachedJobs = await redis.get('jobs:all');
if (cachedJobs) return JSON.parse(cachedJobs);
```

### 3. Connection Pooling
```javascript
// Increase PostgreSQL pool size
const pool = new Pool({
  max: 20,  // Increase from default 10
  idleTimeoutMillis: 30000,
});
```

### 4. Rate Limiting
```javascript
// Adjust rate limits if causing 429 errors
createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,  // Increase limit
});
```

## CI/CD Integration

### GitHub Actions Example

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
      
      - name: Setup k6
        uses: grafana/setup-k6-action@v1
      
      - name: Start Backend
        run: |
          cd backend
          npm install
          npm start &
          sleep 10
      
      - name: Run Load Test
        run: |
          cd backend
          k6 run tests/load/scenarios/load-test.js
      
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: backend/tests/load/results/
```

## Advanced Features

### Export Results to JSON

```powershell
k6 run --out json=results.json tests/load/scenarios/load-test.js
```

### Custom Environment Variables

```powershell
$env:BASE_URL = 'https://staging.recruitiq.com'
npm run test:load
```

### Run Specific Duration

```powershell
k6 run --duration 30s --vus 10 tests/load/scenarios/load-test.js
```

### Generate HTML Report

```powershell
# Run test with JSON output
k6 run --out json=results.json tests/load/scenarios/load-test.js

# Convert to HTML (requires k6-reporter)
npm install -g k6-to-html
k6-to-html results.json results.html
```

## Troubleshooting

### Login Failures (401 Errors)

**Problem**: Load tests failing with "Account temporarily locked" errors

**Solution**: Clear account lockouts by running:
```powershell
cd C:\RecruitIQ\backend
node scripts/setup-loadtest-user.js
```

This clears both database and Redis lockouts for the test user.

### Rate Limiting (429 Errors)

**Problem**: Tests failing with "Too many requests" errors

**Solution**: Make sure you started the server with `npm run start:loadtest` (not `npm start`). This enables the `LOAD_TEST=true` flag which increases rate limits 1000x.

If already running, restart:
```powershell
# Stop current server (Ctrl+C or):
Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess | Stop-Process -Force

# Start with load test mode:
npm run start:loadtest
```

### "k6 is not recognized"

**Solution**: Restart PowerShell or run:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### Port 4000 Already in Use

**Solution**:
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess | Stop-Process -Force
```

### High Memory Usage

**Solution**: Monitor with:
```powershell
Get-Process node | Select-Object ProcessName, @{Name='MemoryMB';Expression={$_.WS / 1MB}}
```

### Server Not Logging Requests

**Problem**: Load tests run but no logs appear

**Solution**: Check if server is actually receiving requests:
```powershell
# Test health endpoint manually:
Invoke-RestMethod -Uri 'http://localhost:4000/health'

# Test login manually:
$body = @{email='loadtest@recruitiq.com';password='LoadTest123!@#'} | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:4000/api/auth/login' -Method POST -Body $body -ContentType 'application/json'
```

## Resources

- 📖 [k6 Official Documentation](https://k6.io/docs/)
- 🎓 [k6 Learning Center](https://k6.io/docs/examples/)
- 📊 [k6 Cloud Platform](https://app.k6.io/)
- 💬 [k6 Community Forum](https://community.k6.io/)
- 🎥 [k6 YouTube Channel](https://www.youtube.com/c/k6test)

## Next Steps

1. ✅ Run smoke test: `npm run test:load:smoke`
2. ✅ Review results and metrics
3. ✅ Identify performance bottlenecks
4. ✅ Optimize and re-test
5. ✅ Integrate into CI/CD pipeline
6. ✅ Set up monitoring (Grafana + k6)

---

**Last Updated**: October 31, 2025  
**k6 Version**: 1.3.0  
**Status**: ✅ Ready to use  
**Test Suite**: 5 comprehensive scenarios
