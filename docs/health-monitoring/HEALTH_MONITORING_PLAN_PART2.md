# Health Monitoring System - Implementation Plan (Part 2)

**Continuation of:** [HEALTH_MONITORING_PLAN.md](./HEALTH_MONITORING_PLAN.md)

---

## Phase 3: Alert Engine (Days 3-4)

**Goal:** Build intelligent alerting system with notifications

### Tasks

#### 1. Alert Rule Engine
**File:** `backend/src/services/alertEngine.js`

**Features:**
- Configurable alert rules
- Threshold-based triggers
- Anomaly detection
- Alert severity classification
- Alert deduplication
- Alert escalation logic

**Rule Types:**
```javascript
const alertRules = [
  {
    id: 'db-connection-failure',
    name: 'Database Connection Failure',
    severity: 'critical',
    condition: {
      metric: 'database.status',
      operator: 'equals',
      value: 'unhealthy',
      duration: 60 // seconds
    },
    notification: {
      channels: ['email', 'sms'],
      recipients: ['admin@recruitiq.com'],
      escalateAfter: 300 // 5 minutes
    }
  },
  {
    id: 'high-memory-usage',
    name: 'High Memory Usage',
    severity: 'warning',
    condition: {
      metric: 'system.memory.usedPercent',
      operator: 'greaterThan',
      value: 85,
      duration: 300 // 5 minutes sustained
    },
    notification: {
      channels: ['email'],
      recipients: ['ops@recruitiq.com']
    }
  },
  {
    id: 'api-response-time',
    name: 'Slow API Response Time',
    severity: 'warning',
    condition: {
      metric: 'api.averageResponseTime',
      operator: 'greaterThan',
      value: 1000, // 1 second
      duration: 180 // 3 minutes
    },
    notification: {
      channels: ['email'],
      recipients: ['dev@recruitiq.com']
    }
  }
];
```

**Duration:** 8 hours

#### 2. Alert Notification Service
**File:** `backend/src/services/alertNotification.js`

**Channels:**
- Email notifications (using existing email service)
- SMS notifications (Twilio integration)
- Webhook notifications (for external integrations)
- In-app notifications (Portal alerts)

**Features:**
- Template-based messages
- Notification batching (prevent spam)
- Delivery retry logic
- Notification status tracking

**Duration:** 6 hours

#### 3. Alert Management API
**File:** `backend/src/routes/admin/alerts.js`

**Endpoints:**
```javascript
// Alert Management
GET    /api/admin/alerts                  // List all alerts
GET    /api/admin/alerts/:id              // Get alert details
POST   /api/admin/alerts/:id/acknowledge  // Acknowledge alert
POST   /api/admin/alerts/:id/resolve      // Resolve alert
POST   /api/admin/alerts/:id/snooze       // Snooze alert
DELETE /api/admin/alerts/:id              // Delete alert

// Alert Rules
GET    /api/admin/alerts/rules            // List alert rules
POST   /api/admin/alerts/rules            // Create alert rule
PUT    /api/admin/alerts/rules/:id        // Update alert rule
DELETE /api/admin/alerts/rules/:id        // Delete alert rule

// Alert Configuration
GET    /api/admin/alerts/config           // Get alert config
PUT    /api/admin/alerts/config           // Update alert config
```

**Duration:** 5 hours

#### 4. Alert History & Analytics
**File:** `backend/src/services/alertAnalytics.js`

**Features:**
- Alert frequency analysis
- MTTR (Mean Time To Resolution) tracking
- Alert pattern detection
- False positive identification
- SLA compliance reporting

**Duration:** 4 hours

#### 5. Integration Tests
**File:** `backend/tests/integration/alerting.test.js`

**Test Scenarios:**
- Alert triggering based on health metrics
- Alert deduplication
- Alert escalation
- Notification delivery
- Alert acknowledgment and resolution

**Duration:** 4 hours

### Deliverables
- ✅ Alert rule engine with configurable rules
- ✅ Multi-channel notification system
- ✅ Alert management API
- ✅ Alert analytics and reporting

### Acceptance Criteria
- Alerts trigger within 30 seconds of condition being met
- No duplicate alerts within 5 minutes
- Notification delivery rate > 99%
- False positive rate < 5%

---

## Phase 4: Health API & WebSocket (Days 4-5)

**Goal:** Build REST API and real-time WebSocket for health data

### Tasks

#### 1. Health REST API
**File:** `backend/src/routes/admin/health.js`

**Endpoints:**

```javascript
// System Overview
GET /api/admin/health/overview
Response: {
  overall: {
    status: 'healthy',
    score: 98.5,
    uptime: 3600,
    lastUpdate: '2025-11-20T10:30:00Z'
  },
  services: {
    backend: { status: 'healthy', instances: 3, healthy: 3 },
    frontend: { status: 'healthy', instances: 4, healthy: 4 },
    database: { status: 'healthy', instances: 1, healthy: 1 }
  },
  vps: [
    { id: 'vps-1', status: 'healthy', load: 45 },
    { id: 'vps-2', status: 'healthy', load: 52 }
  ],
  activeAlerts: 2
}

// VPS-Specific Health
GET /api/admin/health/vps/:vpsId
Response: {
  vpsId: 'vps-1',
  status: 'healthy',
  services: [
    {
      name: 'backend-api',
      status: 'healthy',
      uptime: 3600,
      responseTime: 45,
      checks: {
        database: 'healthy',
        redis: 'healthy',
        s3: 'healthy'
      }
    },
    {
      name: 'nexus-frontend',
      status: 'healthy',
      uptime: 3600
    }
  ],
  system: {
    cpu: { usage: 45, cores: 4 },
    memory: { used: 6.2, total: 16, percent: 38.75 },
    disk: { used: 120, total: 500, percent: 24 }
  },
  tenants: ['tenant-1', 'tenant-2', 'tenant-3']
}

// Tenant-Specific Health
GET /api/admin/health/tenant/:tenantId
Response: {
  tenantId: 'tenant-acme',
  organizationName: 'ACME Corp',
  status: 'healthy',
  vpsId: 'vps-1',
  services: [
    { name: 'backend', status: 'healthy', url: 'https://acme.recruitiq.nl/api' },
    { name: 'nexus', status: 'healthy', url: 'https://nexus.acme.recruitiq.nl' },
    { name: 'paylinq', status: 'healthy', url: 'https://paylinq.acme.recruitiq.nl' }
  ],
  lastHealthCheck: '2025-11-20T10:30:00Z',
  uptime: 99.98,
  activeAlerts: 0
}

// Historical Metrics
GET /api/admin/health/history?vpsId=vps-1&timeRange=24h&metric=cpu
Response: {
  metric: 'cpu',
  timeRange: '24h',
  dataPoints: [
    { timestamp: '2025-11-20T09:00:00Z', value: 42 },
    { timestamp: '2025-11-20T10:00:00Z', value: 45 },
    { timestamp: '2025-11-20T11:00:00Z', value: 48 }
  ]
}

// Service Dependencies
GET /api/admin/health/dependencies?service=backend
Response: {
  service: 'backend',
  dependencies: [
    { name: 'postgres', status: 'healthy', responseTime: 5 },
    { name: 'redis', status: 'healthy', responseTime: 2 },
    { name: 's3', status: 'healthy', responseTime: 10 }
  ]
}

// Health Metrics Export
GET /api/admin/health/export?format=json&timeRange=7d
Response: CSV or JSON export of historical health data
```

**Duration:** 8 hours

#### 2. WebSocket Real-Time Updates
**File:** `backend/src/websocket/healthStream.js`

**Implementation:**
```javascript
import { Server } from 'socket.io';
import { authenticateSocket } from '../middleware/socketAuth.js';

export function setupHealthWebSocket(server) {
  const io = new Server(server, {
    path: '/api/admin/health/stream',
    cors: {
      origin: process.env.PORTAL_URL,
      credentials: true
    }
  });

  // Authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log('Health monitoring client connected:', socket.id);

    // Subscribe to specific VPS
    socket.on('subscribe:vps', (vpsId) => {
      socket.join(`vps:${vpsId}`);
    });

    // Subscribe to specific tenant
    socket.on('subscribe:tenant', (tenantId) => {
      socket.join(`tenant:${tenantId}`);
    });

    // Subscribe to alerts
    socket.on('subscribe:alerts', () => {
      socket.join('alerts');
    });

    socket.on('disconnect', () => {
      console.log('Health monitoring client disconnected:', socket.id);
    });
  });

  return io;
}

// Emit health updates
export function emitHealthUpdate(io, data) {
  if (data.vpsId) {
    io.to(`vps:${data.vpsId}`).emit('health:update', data);
  }
  if (data.tenantId) {
    io.to(`tenant:${data.tenantId}`).emit('health:update', data);
  }
  // Broadcast to all connected clients
  io.emit('health:update', data);
}

// Emit alert
export function emitAlert(io, alert) {
  io.to('alerts').emit('alert:new', alert);
}
```

**Duration:** 6 hours

#### 3. API Client Integration
**File:** `packages/api-client/src/products/portal.ts`

**Add Methods:**
```typescript
// Health Monitoring Methods
async getHealthOverview() {
  return this.client.get(`${this.adminPath}/health/overview`);
}

async getVPSHealth(vpsId: string) {
  return this.client.get(`${this.adminPath}/health/vps/${vpsId}`);
}

async getTenantHealth(tenantId: string) {
  return this.client.get(`${this.adminPath}/health/tenant/${tenantId}`);
}

async getHealthHistory(filters: {
  vpsId?: string;
  tenantId?: string;
  metric?: string;
  timeRange?: string;
}) {
  const params = new URLSearchParams(filters as any);
  return this.client.get(`${this.adminPath}/health/history?${params}`);
}

async getServiceDependencies(service: string) {
  return this.client.get(`${this.adminPath}/health/dependencies?service=${service}`);
}

async exportHealthMetrics(format: 'json' | 'csv', timeRange: string) {
  return this.client.get(`${this.adminPath}/health/export?format=${format}&timeRange=${timeRange}`);
}

// WebSocket connection
connectHealthStream(callbacks: {
  onHealthUpdate?: (data: any) => void;
  onAlert?: (alert: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}) {
  const socket = io(this.client.baseURL, {
    path: '/api/admin/health/stream',
    withCredentials: true
  });

  socket.on('connect', callbacks.onConnect || (() => {}));
  socket.on('disconnect', callbacks.onDisconnect || (() => {}));
  socket.on('health:update', callbacks.onHealthUpdate || (() => {}));
  socket.on('alert:new', callbacks.onAlert || (() => {}));

  return {
    socket,
    subscribeToVPS: (vpsId: string) => socket.emit('subscribe:vps', vpsId),
    subscribeToTenant: (tenantId: string) => socket.emit('subscribe:tenant', tenantId),
    subscribeToAlerts: () => socket.emit('subscribe:alerts'),
    disconnect: () => socket.disconnect()
  };
}
```

**Duration:** 4 hours

#### 4. Caching Strategy
**File:** `backend/src/services/healthCache.js`

**Implementation:**
```javascript
import redis from '../config/redis.js';

class HealthCache {
  constructor() {
    this.TTL = {
      overview: 30,      // 30 seconds
      vpsHealth: 30,     // 30 seconds
      tenantHealth: 60,  // 1 minute
      history: 300       // 5 minutes
    };
  }

  async getOverview() {
    const cached = await redis.get('health:overview');
    return cached ? JSON.parse(cached) : null;
  }

  async setOverview(data) {
    await redis.setex('health:overview', this.TTL.overview, JSON.stringify(data));
  }

  async getVPSHealth(vpsId) {
    const cached = await redis.get(`health:vps:${vpsId}`);
    return cached ? JSON.parse(cached) : null;
  }

  async setVPSHealth(vpsId, data) {
    await redis.setex(`health:vps:${vpsId}`, this.TTL.vpsHealth, JSON.stringify(data));
  }

  async invalidate(pattern) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export default new HealthCache();
```

**Duration:** 3 hours

#### 5. Rate Limiting & Authentication
**File:** `backend/src/middleware/healthAuth.js`

**Implementation:**
```javascript
import rateLimit from 'express-rate-limit';
import { authenticate, requireRole } from './auth.js';

// Rate limit for health API
export const healthRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    error: 'Too many health check requests',
    errorCode: 'RATE_LIMIT_EXCEEDED'
  }
});

// Authentication for admin health endpoints
export const healthAuth = [
  authenticate,
  requireRole('admin', 'super_admin')
];

// WebSocket authentication
export async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth.token;
    const decoded = verifyToken(token);
    
    if (!['admin', 'super_admin'].includes(decoded.role)) {
      return next(new Error('Insufficient permissions'));
    }
    
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
}
```

**Duration:** 2 hours

### Deliverables
- ✅ Comprehensive health REST API
- ✅ Real-time WebSocket updates
- ✅ API client integration
- ✅ Caching layer for performance
- ✅ Authentication and rate limiting

### Acceptance Criteria
- API response time < 100ms (cached) or < 500ms (uncached)
- WebSocket updates delivered within 1 second
- Cache hit rate > 90%
- 100% API coverage in client library

---

## Phase 5: Portal Dashboard (Days 5-7)

**Goal:** Build comprehensive health monitoring dashboard in Portal

### Tasks

#### 1. Health Overview Dashboard
**File:** `apps/portal/src/pages/health/HealthDashboard.jsx`

**Features:**
- Real-time system health status
- Service availability grid
- Active alerts panel
- Health score metrics
- Quick actions (acknowledge alerts, view details)

**Duration:** 8 hours

#### 2. VPS Health Details Page
**File:** `apps/portal/src/pages/health/VPSHealthDetails.jsx`

**Features:**
- VPS-specific health metrics
- Service status list
- System resource charts
- Tenant list on VPS
- Historical performance graphs

**Duration:** 6 hours

#### 3. Tenant Health Details Page
**File:** `apps/portal/src/pages/health/TenantHealthDetails.jsx`

**Features:**
- Tenant-specific health status
- Application availability
- Recent health events
- SLA compliance
- Quick actions (restart services, view logs)

**Duration:** 6 hours

#### 4. Metrics & Charts Page
**File:** `apps/portal/src/pages/health/HealthMetrics.jsx`

**Features:**
- Time-series charts (CPU, memory, response time)
- Customizable date ranges
- Metric comparison across VPS
- Export functionality
- Chart annotations (deployments, incidents)

**Duration:** 8 hours

#### 5. Alert Management Page
**File:** `apps/portal/src/pages/health/AlertManagement.jsx`

**Features:**
- Active alerts list
- Alert history
- Alert rule configuration
- Alert analytics
- Notification settings

**Duration:** 6 hours

### Component Breakdown

See `HEALTH_MONITORING_PLAN_PART3.md` for detailed component specifications...
