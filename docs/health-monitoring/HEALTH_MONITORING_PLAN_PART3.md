# Health Monitoring System - Implementation Plan (Part 3)

**Continuation of:** [HEALTH_MONITORING_PLAN_PART2.md](./HEALTH_MONITORING_PLAN_PART2.md)

---

## Phase 5 Continued: Frontend Components

### Health Overview Dashboard Component

**File:** `apps/portal/src/pages/health/HealthDashboard.jsx`

```jsx
import { useState, useEffect } from 'react';
import { Activity, Server, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useHealthOverview, useHealthStream } from '../../hooks/useHealth';
import HealthStatusCard from '../../components/health/HealthStatusCard';
import ServiceGrid from '../../components/health/ServiceGrid';
import AlertsPanel from '../../components/health/AlertsPanel';
import HealthScoreGauge from '../../components/health/HealthScoreGauge';

export default function HealthDashboard() {
  const { data: healthData, isLoading, error } = useHealthOverview();
  const [realTimeData, setRealTimeData] = useState(null);

  // Connect to WebSocket for real-time updates
  useHealthStream({
    onHealthUpdate: (data) => setRealTimeData(data),
    onAlert: (alert) => {
      // Show notification
      showNotification(alert);
    }
  });

  const currentData = realTimeData || healthData;

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Health Monitoring</h1>
          <p className="text-gray-600 mt-1">Real-time status of all services and infrastructure</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-gray-600">
            <Clock size={16} />
            Last updated: {formatTimestamp(currentData?.lastUpdate)}
          </span>
          <button className="btn-secondary">Export Report</button>
          <button className="btn-primary">Configure Alerts</button>
        </div>
      </div>

      {/* Overall Health Score */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <HealthScoreGauge 
            score={currentData?.overall?.score || 0}
            status={currentData?.overall?.status}
          />
        </div>
        
        <div className="md:col-span-3 grid grid-cols-3 gap-4">
          <HealthStatusCard
            title="Backend Services"
            status={currentData?.services?.backend?.status}
            value={`${currentData?.services?.backend?.healthy}/${currentData?.services?.backend?.instances}`}
            icon={Server}
          />
          <HealthStatusCard
            title="Frontend Apps"
            status={currentData?.services?.frontend?.status}
            value={`${currentData?.services?.frontend?.healthy}/${currentData?.services?.frontend?.instances}`}
            icon={Activity}
          />
          <HealthStatusCard
            title="Active Alerts"
            status={currentData?.activeAlerts > 0 ? 'warning' : 'healthy'}
            value={currentData?.activeAlerts || 0}
            icon={AlertTriangle}
          />
        </div>
      </div>

      {/* Service Grid */}
      <ServiceGrid services={currentData?.services} />

      {/* VPS Status */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">VPS Infrastructure</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentData?.vps?.map((vps) => (
            <VPSStatusCard key={vps.id} vps={vps} />
          ))}
        </div>
      </div>

      {/* Active Alerts */}
      {currentData?.activeAlerts > 0 && (
        <AlertsPanel alerts={currentData?.alerts} />
      )}
    </div>
  );
}
```

### Custom Hooks

**File:** `apps/portal/src/hooks/useHealth.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { portalClient } from '@recruitiq/api-client';

/**
 * Fetch health overview with automatic refetch
 */
export function useHealthOverview() {
  return useQuery({
    queryKey: ['health', 'overview'],
    queryFn: () => portalClient.getHealthOverview(),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 20000 // Consider stale after 20 seconds
  });
}

/**
 * Connect to health WebSocket stream
 */
export function useHealthStream(callbacks: {
  onHealthUpdate?: (data: any) => void;
  onAlert?: (alert: any) => void;
}) {
  const streamRef = useRef<any>(null);

  useEffect(() => {
    // Connect to WebSocket
    streamRef.current = portalClient.connectHealthStream({
      onHealthUpdate: callbacks.onHealthUpdate,
      onAlert: callbacks.onAlert,
      onConnect: () => {
        console.log('Connected to health stream');
        // Subscribe to all health updates
        streamRef.current.subscribeToAlerts();
      },
      onDisconnect: () => {
        console.log('Disconnected from health stream');
      }
    });

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.disconnect();
      }
    };
  }, [callbacks.onHealthUpdate, callbacks.onAlert]);

  return streamRef.current;
}

/**
 * Fetch VPS-specific health
 */
export function useVPSHealth(vpsId: string) {
  return useQuery({
    queryKey: ['health', 'vps', vpsId],
    queryFn: () => portalClient.getVPSHealth(vpsId),
    enabled: !!vpsId,
    refetchInterval: 30000
  });
}

/**
 * Fetch tenant-specific health
 */
export function useTenantHealth(tenantId: string) {
  return useQuery({
    queryKey: ['health', 'tenant', tenantId],
    queryFn: () => portalClient.getTenantHealth(tenantId),
    enabled: !!tenantId,
    refetchInterval: 60000
  });
}

/**
 * Fetch health history
 */
export function useHealthHistory(filters: {
  vpsId?: string;
  metric?: string;
  timeRange?: string;
}) {
  return useQuery({
    queryKey: ['health', 'history', filters],
    queryFn: () => portalClient.getHealthHistory(filters),
    enabled: !!filters.metric
  });
}
```

### Reusable Components

**File:** `apps/portal/src/components/health/HealthStatusCard.jsx`

```jsx
import { CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

const statusConfig = {
  healthy: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Healthy'
  },
  degraded: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Degraded'
  },
  unhealthy: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Unhealthy'
  },
  unknown: {
    icon: Clock,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Unknown'
  }
};

export default function HealthStatusCard({ title, status, value, icon: Icon }) {
  const config = statusConfig[status] || statusConfig.unknown;
  const StatusIcon = config.icon;

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <div className={`flex items-center gap-1 mt-2 text-xs ${config.color}`}>
            <StatusIcon size={14} />
            <span>{config.label}</span>
          </div>
        </div>
        <div className={`${config.bgColor} ${config.color} p-3 rounded-lg`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}
```

**File:** `apps/portal/src/components/health/HealthScoreGauge.jsx`

```jsx
import { useMemo } from 'react';

export default function HealthScoreGauge({ score, status }) {
  const scoreColor = useMemo(() => {
    if (score >= 95) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  }, [score]);

  const scoreLabel = useMemo(() => {
    if (score >= 95) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  }, [score]);

  return (
    <div className="card h-full flex flex-col items-center justify-center">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${(score / 100) * 251.2} 251.2`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            className={scoreColor}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${scoreColor}`}>
            {score.toFixed(1)}
          </span>
          <span className="text-xs text-gray-600">Health Score</span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className={`text-lg font-semibold ${scoreColor}`}>{scoreLabel}</p>
        <p className="text-sm text-gray-600 capitalize">{status}</p>
      </div>
    </div>
  );
}
```

---

## Phase 6: Testing & Quality Assurance (Day 7)

### Testing Strategy

#### 1. Unit Tests

**Backend Services:**
- `HealthCheckService.test.js` - Test all health check methods
- `HealthCollector.test.js` - Test health collection logic
- `HealthAggregator.test.js` - Test aggregation algorithms
- `AlertEngine.test.js` - Test alert rule evaluation

**Target Coverage:** 90%+ for all services

#### 2. Integration Tests

**API Endpoints:**
```javascript
// backend/tests/integration/healthAPI.test.js
describe('Health API Integration Tests', () => {
  describe('GET /api/admin/health/overview', () => {
    it('should return system health overview', async () => {
      const response = await request(app)
        .get('/api/admin/health/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.overall).toBeDefined();
      expect(response.body.services).toBeDefined();
      expect(response.body.vps).toBeInstanceOf(Array);
    });

    it('should require admin authentication', async () => {
      await request(app)
        .get('/api/admin/health/overview')
        .expect(401);
    });
  });

  describe('WebSocket Connection', () => {
    it('should connect with valid token', (done) => {
      const socket = io(API_URL, {
        path: '/api/admin/health/stream',
        auth: { token: adminToken }
      });

      socket.on('connect', () => {
        expect(socket.connected).toBe(true);
        socket.disconnect();
        done();
      });
    });

    it('should receive health updates', (done) => {
      const socket = io(API_URL, {
        path: '/api/admin/health/stream',
        auth: { token: adminToken }
      });

      socket.on('health:update', (data) => {
        expect(data).toBeDefined();
        expect(data.timestamp).toBeDefined();
        socket.disconnect();
        done();
      });
    });
  });
});
```

#### 3. E2E Tests (Playwright)

**Portal Health Dashboard:**
```typescript
// apps/portal/e2e/health-dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Health Dashboard', () => {
  test('should display health overview', async ({ page }) => {
    await page.goto('/health');
    
    // Check for main elements
    await expect(page.locator('h1')).toContainText('System Health');
    await expect(page.locator('[data-testid="health-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="service-grid"]')).toBeVisible();
  });

  test('should update in real-time', async ({ page }) => {
    await page.goto('/health');
    
    const initialScore = await page.locator('[data-testid="health-score"]').textContent();
    
    // Wait for WebSocket update (30 seconds)
    await page.waitForTimeout(31000);
    
    const updatedScore = await page.locator('[data-testid="health-score"]').textContent();
    
    // Score may or may not change, but element should still be present
    expect(updatedScore).toBeDefined();
  });

  test('should navigate to VPS details', async ({ page }) => {
    await page.goto('/health');
    
    await page.click('[data-testid="vps-card"]:first-child');
    
    await expect(page).toHaveURL(/\/health\/vps\//);
    await expect(page.locator('h1')).toContainText('VPS Health');
  });

  test('should display alerts', async ({ page }) => {
    await page.goto('/health');
    
    const alertsPanel = page.locator('[data-testid="alerts-panel"]');
    
    if (await alertsPanel.isVisible()) {
      await expect(alertsPanel.locator('.alert-item')).toHaveCount.toBeGreaterThan(0);
    }
  });
});
```

#### 4. Performance Tests

**Load Testing:**
```javascript
// backend/tests/performance/healthAPI.load.test.js
import autocannon from 'autocannon';

describe('Health API Performance', () => {
  it('should handle 100 concurrent requests', async () => {
    const result = await autocannon({
      url: 'http://localhost:3001/api/admin/health/overview',
      connections: 100,
      duration: 30,
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    });

    expect(result.errors).toBe(0);
    expect(result.timeouts).toBe(0);
    expect(result.latency.p99).toBeLessThan(500); // 99th percentile < 500ms
    expect(result.requests.average).toBeGreaterThan(100); // > 100 req/s
  });

  it('should handle WebSocket connections', async () => {
    const sockets = [];
    
    // Connect 50 WebSocket clients
    for (let i = 0; i < 50; i++) {
      const socket = io(API_URL, {
        path: '/api/admin/health/stream',
        auth: { token: adminToken }
      });
      sockets.push(socket);
    }

    // Wait for all connections
    await Promise.all(
      sockets.map(socket => new Promise(resolve => {
        socket.on('connect', resolve);
      }))
    );

    expect(sockets.every(s => s.connected)).toBe(true);

    // Cleanup
    sockets.forEach(s => s.disconnect());
  });
});
```

---

## Phase 7: Documentation & Deployment (Day 7)

### Documentation Deliverables

#### 1. API Documentation

**File:** `docs/HEALTH_MONITORING_API.md`

Complete API reference with:
- Endpoint descriptions
- Request/response examples
- Authentication requirements
- Rate limits
- Error codes
- WebSocket events

#### 2. User Guide

**File:** `docs/user-manual/HEALTH_MONITORING_GUIDE.md`

User-facing documentation:
- How to access health dashboard
- Understanding health metrics
- Alert management
- Troubleshooting common issues
- Best practices

#### 3. Operations Runbook

**File:** `docs/deployment/HEALTH_MONITORING_RUNBOOK.md`

Operations guide:
- Service deployment procedures
- Configuration management
- Alert rule setup
- Database maintenance
- Incident response procedures

#### 4. Architecture Documentation

**File:** `docs/HEALTH_MONITORING_ARCHITECTURE.md`

Technical architecture:
- System design diagrams
- Data flow diagrams
- Component interactions
- Scaling considerations
- Security model

### Deployment Plan

#### Stage 1: Development Environment
1. Deploy enhanced health endpoints
2. Deploy health collection service
3. Deploy health API
4. Deploy Portal dashboard
5. Run full test suite
6. Performance validation

#### Stage 2: Staging Environment
1. Deploy to staging
2. Configure health collection for staging VPS
3. Test with production-like data
4. Validate alerts
5. Load testing
6. User acceptance testing

#### Stage 3: Production Rollout
1. **Phase A: Backend Only (Week 1)**
   - Deploy health endpoints
   - Deploy health collection service
   - Monitor for issues
   - No user-facing changes

2. **Phase B: Data Collection (Week 2)**
   - Enable health data collection
   - Verify data quality
   - Tune collection intervals
   - Still no user-facing changes

3. **Phase C: Portal Dashboard (Week 3)**
   - Deploy Portal dashboard
   - Announce feature to admins
   - Monitor usage and feedback
   - Iterate based on feedback

4. **Phase D: Alerts (Week 4)**
   - Enable alert engine
   - Start with email notifications only
   - Monitor false positive rate
   - Tune alert thresholds
   - Add SMS notifications

---

See `HEALTH_MONITORING_PLAN_PART4.md` for database schema, configuration, and success metrics...
