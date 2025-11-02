# Production VPS Resource Planning Guide

## Executive Summary

This guide helps you determine the appropriate VPS resources for deploying RecruitIQ to production. It includes baseline recommendations, load testing methodology, and scaling strategies.

---

## 📊 Quick Recommendations

### Minimum Production Environment (1-50 users)
| Resource | Specification | Justification |
|----------|--------------|---------------|
| **CPU** | 2 vCPU | Node.js is single-threaded but benefits from 2 cores for OS tasks |
| **RAM** | 4 GB | 2 GB for Node.js, 1.5 GB for PostgreSQL, 512 MB for Redis, 1 GB buffer |
| **Storage** | 40 GB SSD | 10 GB OS, 10 GB app/logs, 20 GB database/backups |
| **Bandwidth** | 1 TB/month | ~30 GB/day for typical usage |
| **Swap** | 2 GB | Emergency memory when RAM is exceeded |

**Estimated Cost**: $20-40/month (DigitalOcean, Hetzner, Vultr)

### Standard Production Environment (50-200 users)
| Resource | Specification | Justification |
|----------|--------------|---------------|
| **CPU** | 4 vCPU | Better concurrency handling, faster response times |
| **RAM** | 8 GB | 4 GB Node.js, 3 GB PostgreSQL, 512 MB Redis, 512 MB buffer |
| **Storage** | 80 GB SSD | 10 GB OS, 20 GB app/logs, 50 GB database/backups |
| **Bandwidth** | 2 TB/month | ~65 GB/day for moderate usage |
| **Swap** | 2 GB | Emergency memory buffer |

**Estimated Cost**: $40-80/month

### High Performance Environment (200-500 users)
| Resource | Specification | Justification |
|----------|--------------|---------------|
| **CPU** | 8 vCPU | Handles heavy concurrent load |
| **RAM** | 16 GB | 8 GB Node.js, 6 GB PostgreSQL, 1 GB Redis, 1 GB buffer |
| **Storage** | 160 GB SSD | 10 GB OS, 30 GB app/logs, 120 GB database/backups |
| **Bandwidth** | 4 TB/month | ~130 GB/day for high usage |
| **Swap** | 4 GB | Larger emergency buffer |

**Estimated Cost**: $80-160/month

### Enterprise Environment (500+ users)
Consider **horizontal scaling** with multiple VPS instances:
- **Load Balancer**: 1x 2 vCPU, 2 GB RAM
- **App Servers**: 2-4x 4 vCPU, 8 GB RAM
- **Database**: 1x 8 vCPU, 16 GB RAM (dedicated)
- **Redis**: 1x 2 vCPU, 4 GB RAM (dedicated)
- **Monitoring**: 1x 2 vCPU, 4 GB RAM

**Estimated Cost**: $300-600/month

---

## 🔍 How to Determine Your Actual Requirements

### Step 1: Run Load Tests

Your application includes **k6 load tests** (industry standard). Here's how to use them:

#### 1.1 Install k6

```powershell
# Windows (using Chocolatey)
choco install k6

# Or using winget
winget install k6

# Verify installation
k6 version
```

#### 1.2 Start Your Backend

```powershell
cd C:\RecruitIQ\backend
npm start
```

#### 1.3 Run Load Tests (Progressive Testing)

```powershell
# Test 1: Smoke Test (2 concurrent users, 1 minute)
# Purpose: Verify basic functionality
npm run test:load:smoke

# Test 2: Load Test (50 concurrent users, 5 minutes)
# Purpose: Simulate normal production load
npm run test:load

# Test 3: Stress Test (50→150 users, 10 minutes)
# Purpose: Find your breaking point
npm run test:load:stress

# Test 4: Spike Test (10→200 users, 3 minutes)
# Purpose: Test sudden traffic surges
npm run test:load:spike

# Test 5: Soak Test (20 users, 30 minutes)
# Purpose: Check for memory leaks and stability
npm run test:load:soak
```

#### 1.4 Analyze Results

**Good Performance (Ready for Production)**:
```
http_req_duration..............: avg=150ms  p(95)=300ms  p(99)=500ms
http_req_failed................: 0.00%
http_reqs......................: 250/s
```

**Degraded Performance (Need More Resources)**:
```
http_req_duration..............: avg=800ms  p(95)=1.5s  p(99)=3s
http_req_failed................: 5.00%
http_reqs......................: 80/s
```

**System Failure (Definitely Need More Resources)**:
```
http_req_duration..............: avg=5s  p(95)=10s  p(99)=15s
http_req_failed................: 30.00%
http_reqs......................: 20/s
```

### Step 2: Monitor Resource Usage During Tests

#### 2.1 Monitor Memory Usage

```powershell
# Watch Node.js memory in real-time (run in separate terminal)
while ($true) {
    Get-Process node -ErrorAction SilentlyContinue | 
    Select-Object ProcessName, 
        @{Name='MemoryMB';Expression={[math]::Round($_.WS / 1MB, 2)}},
        @{Name='CPUPercent';Expression={$_.CPU}} |
    Format-Table -AutoSize
    Start-Sleep -Seconds 2
}
```

#### 2.2 Check Database Connection Pool

During load test, check your logs for:
- Connection pool exhaustion warnings
- Slow query logs
- Connection timeouts

### Step 3: Calculate Resource Needs

Based on load test results:

#### CPU Calculation
```
If p95 response time > 500ms during load test:
  → Increase CPU cores
  → Current: 2 vCPU → Recommended: 4 vCPU

If p95 response time > 1000ms during stress test:
  → Significantly increase CPU
  → Current: 2 vCPU → Recommended: 8 vCPU
```

#### RAM Calculation
```
Node.js Memory Usage (from monitoring):
  Base: ~200 MB (idle)
  Per connection: ~2-5 MB
  Peak during load test: [YOUR VALUE] MB

PostgreSQL Memory:
  Minimum: 512 MB
  Recommended: 25% of total RAM
  For 50 connections: 1-2 GB
  For 100 connections: 2-3 GB

Redis Memory:
  Session storage: ~1 KB per active session
  Cache: Variable (depends on usage)
  Recommended: 512 MB - 1 GB

Total RAM = Node.js Peak + PostgreSQL + Redis + 1 GB buffer
```

#### Storage Calculation
```
Application: 10 GB (code, dependencies, logs)
Database: [Estimate based on data model]
  - Users: ~100 KB per user
  - Jobs: ~50 KB per job
  - Candidates: ~200 KB per candidate (with resumes)
  - Applications: ~100 KB per application
  
Example for 1000 users, 500 jobs, 2000 candidates:
  = (1000 * 0.1) + (500 * 0.05) + (2000 * 0.2) + (5000 * 0.1)
  = 100 + 25 + 400 + 500 = 1.025 GB
  
Add 3x for indexes and growth: 3 GB
Add 2x for backups: 6 GB

Total Storage = 10 GB + [Database] * 5
```

---

## 📈 Performance Benchmarks

### Current Application Performance Targets

Based on `backend/tests/load/` tests:

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **P95 Response Time** | < 500ms | < 1000ms |
| **P99 Response Time** | < 1000ms | < 2000ms |
| **Success Rate** | > 95% | > 90% |
| **Requests/Second** | > 100 | > 50 |
| **Concurrent Users** | 50 (load), 150 (stress) | N/A |

### Resource Usage Under Load

**During 50 Concurrent Users (Load Test)**:
- Node.js CPU: ~40-60% per core
- Node.js Memory: ~500-800 MB
- PostgreSQL CPU: ~20-30% per core
- PostgreSQL Memory: ~500-1000 MB
- Redis Memory: ~50-100 MB

**During 150 Concurrent Users (Stress Test)**:
- Node.js CPU: ~80-95% per core
- Node.js Memory: ~1-1.5 GB
- PostgreSQL CPU: ~50-70% per core
- PostgreSQL Memory: ~1-2 GB
- Redis Memory: ~100-200 MB

---

## 🏗️ Architecture Recommendations

### Single Server Setup (Recommended for Start)

```
┌─────────────────────────────────────────┐
│         VPS (4 vCPU, 8 GB RAM)         │
│                                         │
│  ┌──────────────────────────────────┐ │
│  │   Nginx (Reverse Proxy + SSL)    │ │
│  │   Port 443 → Port 4000           │ │
│  └──────────────────────────────────┘ │
│                                         │
│  ┌──────────────────────────────────┐ │
│  │   Node.js (RecruitIQ Backend)    │ │
│  │   Port 4000                       │ │
│  │   PM2 (Process Manager)           │ │
│  └──────────────────────────────────┘ │
│                                         │
│  ┌──────────────────────────────────┐ │
│  │   PostgreSQL Database             │ │
│  │   Port 5432 (localhost only)      │ │
│  └──────────────────────────────────┘ │
│                                         │
│  ┌──────────────────────────────────┐ │
│  │   Redis Cache/Sessions            │ │
│  │   Port 6379 (localhost only)      │ │
│  └──────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Pros**:
- ✅ Simple setup and maintenance
- ✅ Lower cost ($40-80/month)
- ✅ Suitable for 50-200 users
- ✅ Easy to backup and restore

**Cons**:
- ⚠️ Single point of failure
- ⚠️ Limited horizontal scaling
- ⚠️ Database and app compete for resources

### Multi-Server Setup (Recommended for Scale)

```
┌────────────────────┐
│   Load Balancer    │
│  (2 vCPU, 2 GB)    │
└─────────┬──────────┘
          │
   ┌──────┴───────┐
   │              │
   ▼              ▼
┌─────────┐  ┌─────────┐
│  App 1  │  │  App 2  │
│ 4 vCPU  │  │ 4 vCPU  │
│  8 GB   │  │  8 GB   │
└────┬────┘  └────┬────┘
     │            │
     └─────┬──────┘
           │
     ┌─────▼─────┐
     │ Database  │
     │  8 vCPU   │
     │  16 GB    │
     └─────┬─────┘
           │
     ┌─────▼─────┐
     │   Redis   │
     │  2 vCPU   │
     │   4 GB    │
     └───────────┘
```

**Pros**:
- ✅ High availability
- ✅ Horizontal scaling
- ✅ Better resource allocation
- ✅ Can handle 500+ users

**Cons**:
- ⚠️ More complex setup
- ⚠️ Higher cost ($300-600/month)
- ⚠️ Requires load balancer configuration

---

## 🔧 Configuration Tuning

### Database Connection Pool

**File**: `backend/src/config/index.js`

```javascript
database: {
  pool: {
    min: parseInt(process.env.DATABASE_POOL_MIN, 10) || 2,
    max: parseInt(process.env.DATABASE_POOL_MAX, 10) || 10,
  },
}
```

**Recommendations by VPS Size**:

| VPS RAM | PostgreSQL RAM | Pool Min | Pool Max |
|---------|----------------|----------|----------|
| 4 GB | 1 GB | 2 | 10 |
| 8 GB | 2 GB | 5 | 20 |
| 16 GB | 4 GB | 10 | 40 |

**Formula**: `Pool Max = (PostgreSQL RAM in MB) / 10`

### Node.js Memory Limits

```bash
# In production, set max memory limit
node --max-old-space-size=2048 src/server.js  # 2 GB
node --max-old-space-size=4096 src/server.js  # 4 GB
node --max-old-space-size=8192 src/server.js  # 8 GB
```

### PM2 Configuration (Process Manager)

**File**: `ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'recruitiq-api',
    script: './src/server.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '2G',  // Restart if exceeds 2 GB
    env: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=2048'
    }
  }]
}
```

**Recommendations**:

| VPS CPU | PM2 Instances | Memory per Instance |
|---------|---------------|---------------------|
| 2 vCPU | 2 | 1 GB |
| 4 vCPU | 4 | 1.5 GB |
| 8 vCPU | 6-8 | 2 GB |

---

## 🎯 Scaling Strategy

### Vertical Scaling (Increase VPS Resources)

**When to Scale Up**:
- ✅ CPU usage consistently > 70%
- ✅ Memory usage consistently > 80%
- ✅ P95 response time > 500ms
- ✅ Disk I/O wait time > 20%

**Upgrade Path**:
```
2 vCPU, 4 GB → 4 vCPU, 8 GB → 8 vCPU, 16 GB → 16 vCPU, 32 GB
```

### Horizontal Scaling (Add More Servers)

**When to Scale Out**:
- ✅ Single server can't handle load even after vertical scaling
- ✅ Need high availability
- ✅ Geographic distribution required

**Steps**:
1. Add load balancer (Nginx, HAProxy, or cloud LB)
2. Deploy app servers (2-4 instances)
3. Use managed PostgreSQL or dedicated server
4. Use Redis cluster for sessions

---

## 🛠️ VPS Provider Recommendations

### Budget-Friendly Options

**Hetzner Cloud** (Best Value)
- 2 vCPU, 4 GB, 40 GB SSD: €4.90/month (~$5.50)
- 4 vCPU, 8 GB, 80 GB SSD: €9.80/month (~$11)
- Location: Germany, Finland
- Pros: Excellent price/performance, 20 TB bandwidth
- Cons: Limited regions

**Vultr** (Good Balance)
- 2 vCPU, 4 GB, 80 GB SSD: $18/month
- 4 vCPU, 8 GB, 160 GB SSD: $36/month
- Location: Multiple regions worldwide
- Pros: Predictable pricing, good network
- Cons: Slightly more expensive than Hetzner

### Standard Options

**DigitalOcean** (Developer-Friendly)
- 2 vCPU, 4 GB, 80 GB SSD: $24/month
- 4 vCPU, 8 GB, 160 GB SSD: $48/month
- Location: Multiple regions worldwide
- Pros: Great documentation, managed databases available
- Cons: Mid-range pricing

**Linode** (Reliable)
- 2 vCPU, 4 GB, 80 GB SSD: $24/month
- 4 vCPU, 8 GB, 160 GB SSD: $48/month
- Location: Multiple regions worldwide
- Pros: Excellent uptime, good support
- Cons: Similar pricing to DigitalOcean

### Enterprise Options

**AWS Lightsail** (AWS Ecosystem)
- 2 vCPU, 4 GB, 80 GB SSD: $40/month
- 4 vCPU, 8 GB, 160 GB SSD: $80/month
- Location: All AWS regions
- Pros: Easy migration to full AWS later
- Cons: More expensive

**Azure VM** (Microsoft Ecosystem)
- B2s (2 vCPU, 4 GB): ~$50/month
- B4ms (4 vCPU, 16 GB): ~$150/month
- Location: All Azure regions
- Pros: Enterprise features, integrations
- Cons: Complex pricing, can get expensive

---

## 📋 Pre-Deployment Checklist

### 1. Run Performance Tests

- [ ] Smoke test passes (npm run test:load:smoke)
- [ ] Load test passes (npm run test:load)
- [ ] Stress test identified limits (npm run test:load:stress)
- [ ] Resource usage monitored during tests
- [ ] Database queries optimized

### 2. Resource Planning

- [ ] Expected concurrent users estimated: _______
- [ ] VPS size selected based on tests: _______
- [ ] Database pool size configured: _______
- [ ] Node.js memory limit set: _______

### 3. Configuration

- [ ] Environment variables configured (.env)
- [ ] Database connection pooling tuned
- [ ] Rate limiting configured
- [ ] CORS origins set correctly
- [ ] JWT secrets generated (32+ characters)
- [ ] SSL/TLS certificates obtained

### 4. Security

- [ ] Firewall rules configured
- [ ] Database not exposed to public
- [ ] Redis not exposed to public
- [ ] Security headers enabled (Helmet)
- [ ] Rate limiting enabled
- [ ] Input validation configured (Joi)

### 5. Monitoring

- [ ] Log aggregation setup (Winston)
- [ ] Health check endpoints tested
- [ ] Monitoring dashboard configured (optional)
- [ ] Backup strategy defined
- [ ] Alerting configured (optional)

---

## 📊 Cost Analysis

### Monthly Cost Breakdown (Standard Setup)

**Single Server (4 vCPU, 8 GB)**:
- VPS: $40-50/month
- Backups: $5/month (20% of VPS cost)
- Bandwidth: Included (typically 2 TB)
- SSL Certificate: Free (Let's Encrypt)
- Domain: $12/year (~$1/month)
- **Total**: ~$46-56/month

**Multi-Server (Production)**:
- Load Balancer: $10/month
- App Servers (2x 4 vCPU, 8 GB): $100/month
- Database (8 vCPU, 16 GB): $150/month
- Redis (2 vCPU, 4 GB): $40/month
- Backups: $30/month
- **Total**: ~$330/month

### Cost per User

| Users | Setup | Monthly Cost | Cost per User |
|-------|-------|--------------|---------------|
| 50 | Single | $50 | $1.00 |
| 100 | Single | $50 | $0.50 |
| 200 | Single | $80 | $0.40 |
| 500 | Multi | $330 | $0.66 |
| 1000 | Multi | $500 | $0.50 |

---

## 🚀 Next Steps

1. **Run Load Tests**: Execute all k6 tests to establish baseline
2. **Monitor Resources**: Watch CPU, RAM, and disk during tests
3. **Calculate Needs**: Use formulas in this guide
4. **Choose VPS Provider**: Based on budget and requirements
5. **Deploy to Staging**: Test in production-like environment
6. **Monitor Production**: Track metrics and adjust as needed

## 📚 Additional Resources

- Load Testing Guide: `backend/tests/load/README.md`
- Quick Start: `backend/tests/load/QUICK_START.md`
- Security Audit: `backend/docs/SECURITY_AUDIT_2025.md`
- Testing Strategy: `backend/docs/TESTING_STRATEGY.md`

---

**Last Updated**: November 1, 2025  
**Version**: 1.0  
**Status**: Production Ready
