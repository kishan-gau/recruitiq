# Health Monitoring System Implementation Plan

**Created:** November 20, 2025  
**Priority:** High  
**Estimated Effort:** 5-7 days  
**Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Proposed Architecture](#proposed-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Success Metrics](#success-metrics)

---

## Executive Summary

### Problem Statement

The RecruitIQ platform currently lacks a comprehensive health monitoring system for production deployments on TransIP VPS. Administrators cannot view real-time health status of:
- Frontend applications (Nexus, PayLinQ, Portal, RecruitIQ)
- Backend API services
- Database connections
- External dependencies (Redis, S3, email services)
- System resources (CPU, memory, disk)
- Network connectivity between services

This creates operational blind spots that:
- **Increase MTTR** (Mean Time To Recovery) - Cannot quickly diagnose issues
- **Risk Service Downtime** - No proactive alerting before failures
- **Complicate Deployments** - No health validation after releases
- **Limit Scalability** - Cannot identify resource bottlenecks
- **Reduce Customer Confidence** - No status page for transparency

### Solution Overview

Implement a comprehensive **Health Monitoring Dashboard** in the Portal application that provides:

1. **Real-Time Health Status** - Live monitoring of all system components
2. **Historical Metrics** - Trend analysis and performance tracking
3. **Alerting System** - Proactive notifications for degraded services
4. **Health Aggregation** - Cross-tenant and cross-VPS health views
5. **Incident Response** - Quick diagnosis tools and remediation actions

### Business Value

| Metric | Current | Target | Impact |
|--------|---------|--------|--------|
| MTTR (Mean Time To Recovery) | 45 min | 10 min | 78% faster incident resolution |
| Unplanned Downtime | 2-3 hours/month | < 30 min/month | 90% reduction |
| False Alert Rate | Unknown | < 5% | Reduced alert fatigue |
| Customer Visibility | 0% | 100% | Trust through transparency |
| Deployment Confidence | Manual checks | Automated validation | Zero-downtime deployments |

### Technical Stack

- **Backend:** Node.js health check services with dependency probing
- **Frontend:** React dashboard with real-time WebSocket updates
- **Storage:** PostgreSQL for historical metrics, Redis for caching
- **Monitoring:** Custom health aggregator + integration with existing logging
- **Alerts:** Email/SMS notifications via existing notification system

---

## Current State Analysis

### Existing Infrastructure

#### 1. Basic Health Endpoints (Backend)

**File:** `backend/src/server.js`

**Current Implementation:**
```javascript
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await dbHealthCheck();
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.env,
      version: '1.0.0',
      services: {
        database: dbHealth.status === 'healthy' ? 'ok' : 'degraded',
        api: 'ok',
      },
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        },
        cpu: process.cpuUsage(),
      }
    };
    
    const statusCode = dbHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: config.env === 'production' ? 'Service temporarily unavailable' : error.message,
    });
  }
});

app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

app.get('/health/ready', async (req, res) => {
  try {
    const dbHealth = await dbHealthCheck();
    if (dbHealth.status === 'healthy') {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not_ready', reason: 'database_unavailable' });
    }
  } catch (error) {
    res.status(503).json({ status: 'not_ready', reason: 'error' });
  }
});
```

**Gaps:**
- ❌ Only checks backend API, not frontend apps
- ❌ Limited dependency checks (only database)
- ❌ No historical data collection
- ❌ No aggregation across VPS instances
- ❌ No alert generation
- ❌ Not integrated with Portal dashboard

#### 2. Portal Dashboard (Frontend)

**File:** `apps/portal/src/pages/Dashboard.jsx`

**Current Implementation:**
```javascript
const stats = [
  {
    name: 'System Health',
    value: '98%',  // ❌ HARDCODED - Not real data
    icon: Activity,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
];
```

**Gaps:**
- ❌ Static/mock data, not fetching real health metrics
- ❌ No real-time updates
- ❌ No drill-down capability
- ❌ No historical trends
- ❌ No per-VPS or per-tenant views

#### 3. VPS Infrastructure Page

**File:** `apps/portal/src/pages/infrastructure/VPSManager.jsx`

**Current Implementation:**
```javascript
// Shows VPS list with CPU/RAM usage
{vpsList.map((vps) => (
  <tr key={vps.id}>
    <td>{vps.cpu_usage_percent?.toFixed(1) || '0'}%</td>
    <td>{vps.memory_usage_percent?.toFixed(1) || '0'}%</td>
  </tr>
))}
```

**Gaps:**
- ❌ No application health per VPS
- ❌ No service-level status
- ❌ No dependency health
- ❌ Resource metrics only, not application health

#### 4. API Client

**File:** `packages/api-client/src/products/portal.ts`

**Current Methods:**
```typescript
async getSecurityDashboard() { ... }
async getDeploymentStats() { ... }
async getVPSInstances() { ... }
```

**Gaps:**
- ❌ No health monitoring methods
- ❌ No real-time health polling
- ❌ No health history retrieval

### Gap Analysis Summary

| Component | Current State | Required State | Gap Severity |
|-----------|---------------|----------------|--------------|
| **Health Data Collection** | Backend only, basic | All services + dependencies | 🔴 Critical |
| **Health Aggregation** | None | Cross-VPS, cross-tenant | 🔴 Critical |
| **Historical Storage** | None | Time-series metrics DB | 🔴 Critical |
| **Real-Time Updates** | None | WebSocket push updates | 🟡 High |
| **Alerting** | None | Email/SMS notifications | 🔴 Critical |
| **Dashboard UI** | Mock data | Live interactive dashboard | 🔴 Critical |
| **Status Page** | None | Public/customer status page | 🟢 Medium |
| **API Integration** | Partial | Complete health API | 🔴 Critical |

---

## Proposed Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Portal Dashboard (Frontend)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Health       │  │ Metrics      │  │ Alerts       │     │
│  │ Overview     │  │ Charts       │  │ Management   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          ↓ ↑ WebSocket + REST API
┌─────────────────────────────────────────────────────────────┐
│              Health Aggregation Service (Backend)            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Health Collector → Health Aggregator → Alert Engine │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgreSQL (Metrics History) + Redis (Cache)        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓ Health Polling
┌─────────────────────────────────────────────────────────────┐
│                    VPS Instances (TransIP)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ VPS-1       │  │ VPS-2       │  │ VPS-N       │        │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │        │
│  │ │Backend  │ │  │ │Backend  │ │  │ │Backend  │ │        │
│  │ │/health  │ │  │ │/health  │ │  │ │/health  │ │        │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │        │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │        │
│  │ │Frontend │ │  │ │Frontend │ │  │ │Frontend │ │        │
│  │ │Apps     │ │  │ │Apps     │ │  │ │Apps     │ │        │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### 1. Health Check Agents (On Each Service)

**Responsibility:** Expose health endpoints with detailed status

**Components:**
- Backend API health endpoints (`/health`, `/health/ready`, `/health/live`)
- Frontend static file serving health (nginx status)
- Database connection health
- External dependency health (Redis, S3, Email)
- System resource health (CPU, Memory, Disk)

**Implementation:** Enhanced existing `/health` endpoints + new checks

#### 2. Health Collector Service (Central Backend)

**Responsibility:** Poll all health endpoints and collect metrics

**Components:**
- Health Poller (configurable intervals)
- Health Parser (normalize responses)
- Health Validator (detect anomalies)
- Metrics Writer (store to database)

**Implementation:** New Node.js service in `backend/src/services/healthCollector.js`

#### 3. Health Aggregator Service (Central Backend)

**Responsibility:** Aggregate and analyze health data

**Components:**
- Multi-VPS aggregation
- Multi-tenant aggregation
- Health score calculation
- Trend analysis
- SLA compliance tracking

**Implementation:** New service in `backend/src/services/healthAggregator.js`

#### 4. Alert Engine (Central Backend)

**Responsibility:** Generate and dispatch alerts

**Components:**
- Alert Rule Engine (configurable thresholds)
- Alert Dispatcher (email, SMS, webhook)
- Alert Deduplication (prevent spam)
- Alert Escalation (severity-based)

**Implementation:** New service in `backend/src/services/alertEngine.js`

#### 5. Health API (Backend REST + WebSocket)

**Responsibility:** Serve health data to Portal

**Endpoints:**
- `GET /api/admin/health/overview` - Current system health
- `GET /api/admin/health/vps/:vpsId` - Per-VPS health
- `GET /api/admin/health/tenant/:tenantId` - Per-tenant health
- `GET /api/admin/health/history` - Historical metrics
- `GET /api/admin/health/alerts` - Active alerts
- `WS /api/admin/health/stream` - Real-time updates

**Implementation:** New routes in `backend/src/routes/admin/health.js`

#### 6. Health Dashboard (Portal Frontend)

**Responsibility:** Display health data to administrators

**Pages:**
- System Health Overview Dashboard
- VPS-specific Health Details
- Tenant-specific Health Details
- Historical Metrics & Charts
- Alert Management
- Health Configuration

**Implementation:** New pages in `apps/portal/src/pages/health/`

### Data Flow

#### Health Check Flow
```
1. Health Collector → Polls /health endpoints (every 30 seconds)
2. Health Parser → Normalizes responses to standard format
3. Health Validator → Compares against baselines, detects anomalies
4. Metrics Writer → Stores to PostgreSQL time-series table
5. Redis Cache → Updates current health status cache
6. WebSocket → Pushes updates to connected Portal clients
```

#### Alert Flow
```
1. Alert Engine → Evaluates health metrics against alert rules
2. Alert Trigger → Creates alert record in database
3. Alert Deduplicator → Checks for duplicate alerts (within 5 min)
4. Alert Dispatcher → Sends notifications (email, SMS, webhook)
5. Alert Tracker → Updates alert status (acknowledged, resolved)
```

#### Dashboard Query Flow
```
1. Portal → Requests health data via REST API
2. Health API → Checks Redis cache first
3. If cached → Returns immediately (< 50ms)
4. If not cached → Queries PostgreSQL + aggregates
5. Health API → Updates Redis cache
6. Portal → Displays data + subscribes to WebSocket
7. WebSocket → Sends real-time updates to Portal
```

---

## Implementation Phases

### Phase 1: Foundation (Days 1-2)

**Goal:** Enhance backend health checks and create data storage

**Tasks:**
1. **Enhanced Health Check Service**
   - File: `backend/src/services/HealthCheckService.js`
   - Add dependency checks (Redis, S3, email)
   - Add system metrics (CPU, memory, disk)
   - Add response time tracking
   - Duration: 4 hours

2. **Health Check Routes**
   - File: `backend/src/routes/health.js`
   - Implement `/health/live` (liveness probe)
   - Implement `/health/ready` (readiness probe)
   - Implement `/health/deps` (dependency status)
   - Duration: 2 hours

3. **Database Schema**
   - File: `backend/src/database/migrations/YYYYMMDD_create_health_tables.sql`
   - `health_checks` table (time-series metrics)
   - `health_alerts` table (alert history)
   - `health_config` table (alert rules)
   - Duration: 3 hours

4. **Unit Tests**
   - Test health check service
   - Test health endpoints
   - Test database schema
   - Duration: 3 hours

**Deliverables:**
- ✅ Enhanced `/health` endpoints on all backend services
- ✅ Database schema for health metrics storage
- ✅ Unit tests with 90%+ coverage

**Acceptance Criteria:**
- All dependency checks complete in < 5 seconds
- Health endpoints return detailed, actionable data
- Database can store 1M+ health check records

---

### Phase 2: Health Collection & Aggregation (Days 2-3)

**Goal:** Build central health collection and aggregation services

**Tasks:**
1. **Health Collector Service**
   - File: `backend/src/services/healthCollector.js`
   - Poll all VPS `/health` endpoints
   - Parse and normalize responses
   - Validate health data
   - Store to database
   - Duration: 6 hours

2. **Health Aggregator Service**
   - File: `backend/src/services/healthAggregator.js`
   - Aggregate health across VPS instances
   - Aggregate health across tenants
   - Calculate health scores
   - Identify trends and anomalies
   - Duration: 6 hours

3. **Redis Caching Layer**
   - File: `backend/src/services/healthCache.js`
   - Cache current health status
   - Cache aggregated metrics
   - Implement cache invalidation
   - Duration: 3 hours

4. **Configuration Management**
   - File: `backend/src/config/healthConfig.js`
   - Health check intervals
   - Alert thresholds
   - VPS endpoint registry
   - Duration: 2 hours

5. **Integration Tests**
   - Test health collection
   - Test health aggregation
   - Test caching layer
   - Duration: 4 hours

**Deliverables:**
- ✅ Automated health collection service
- ✅ Health aggregation with cross-VPS visibility
- ✅ Redis caching for fast queries

**Acceptance Criteria:**
- Health collector polls all VPS every 30 seconds
- Aggregation completes in < 2 seconds
- Cache hit rate > 90%

---

See `HEALTH_MONITORING_PLAN_PART2.md` for Phase 3 onwards...
