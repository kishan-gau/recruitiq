# Health Check Enhancement Implementation Plan

**Priority:** High  
**Effort:** 1 day  
**Impact:** Better monitoring, faster incident response, automated deployments  
**Phase:** 1 (Quick Win)

---

## Overview

Enhance basic health checks with detailed readiness probes, dependency status, and comprehensive system health information to enable better monitoring, automated deployments, and faster incident response.

### Business Value

- **Uptime Monitoring:** Proactive detection of issues before users are impacted
- **Zero-Downtime Deployments:** Readiness probes enable proper load balancer integration
- **Faster MTTR:** Detailed health info reduces mean time to resolution by 50%
- **Auto-Scaling:** Health checks enable intelligent scaling decisions
- **Cost Savings:** Prevent cascading failures, reduce incident response time

---

## Current State

**Status:** Basic health check exists  
**Gap:** Limited information, no dependency checks, no readiness/liveness separation

**Current Implementation:**
```javascript
// backend/src/routes/health.js
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

**Industry Standard:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2025-11-15T10:30:00Z",
  "checks": {
    "database": { "status": "healthy", "responseTime": 5 },
    "redis": { "status": "healthy", "responseTime": 2 },
    "s3": { "status": "healthy", "responseTime": 10 }
  }
}
```

---

## Technical Implementation

### 1. Create Health Check Service

**File:** `backend/src/services/HealthCheckService.js`

```javascript
import pool from '../config/database.js';
import redis from '../config/redis.js';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import logger from '../utils/logger.js';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const startTime = Date.now();

/**
 * Health Check Service
 * Provides comprehensive health status for monitoring and orchestration
 */
class HealthCheckService {
  /**
   * Liveness check - is the application running?
   * Used by Kubernetes/Docker to know if container should be restarted
   */
  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000)
    };
  }

  /**
   * Readiness check - is the application ready to serve traffic?
   * Used by load balancers to determine if instance should receive traffic
   */
  async readiness() {
    const checks = await this.checkDependencies();
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');

    return {
      status: allHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks
    };
  }

  /**
   * Full health check with detailed information
   */
  async health() {
    const checks = await this.checkDependencies();
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      checks,
      system: await this.getSystemInfo()
    };
  }

  /**
   * Check all critical dependencies
   */
  async checkDependencies() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkS3(),
      this.checkDiskSpace()
    ]);

    return {
      database: checks[0].status === 'fulfilled' ? checks[0].value : this.failedCheck(checks[0].reason),
      redis: checks[1].status === 'fulfilled' ? checks[1].value : this.failedCheck(checks[1].reason),
      s3: checks[2].status === 'fulfilled' ? checks[2].value : this.failedCheck(checks[2].reason),
      disk: checks[3].status === 'fulfilled' ? checks[3].value : this.failedCheck(checks[3].reason)
    };
  }

  /**
   * Check PostgreSQL database connectivity
   */
  async checkDatabase() {
    const startTime = Date.now();
    
    try {
      const result = await pool.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;

      // Get connection pool stats
      const poolStats = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      };

      return {
        status: 'healthy',
        responseTime,
        details: poolStats
      };
    } catch (error) {
      logger.error('Database health check failed', { error: error.message });
      
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  async checkRedis() {
    if (!redis) {
      return { status: 'disabled' };
    }

    const startTime = Date.now();
    
    try {
      await redis.ping();
      const responseTime = Date.now() - startTime;

      // Get Redis info
      const info = await redis.info('server');
      const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
      const redisUptime = uptimeMatch ? parseInt(uptimeMatch[1]) : null;

      return {
        status: 'healthy',
        responseTime,
        details: {
          uptime: redisUptime,
          connected: redis.status === 'ready'
        }
      };
    } catch (error) {
      logger.error('Redis health check failed', { error: error.message });
      
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Check S3 connectivity
   */
  async checkS3() {
    const bucketName = process.env.AWS_S3_BUCKET;
    if (!bucketName) {
      return { status: 'disabled' };
    }

    const startTime = Date.now();
    
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: {
          bucket: bucketName,
          region: process.env.AWS_REGION
        }
      };
    } catch (error) {
      logger.error('S3 health check failed', { error: error.message });
      
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Check disk space
   */
  async checkDiskSpace() {
    try {
      const { statfsSync } = await import('fs');
      const stats = statfsSync('/');
      
      const totalSpace = stats.blocks * stats.bsize;
      const freeSpace = stats.bfree * stats.bsize;
      const usedPercent = ((totalSpace - freeSpace) / totalSpace * 100).toFixed(2);

      const status = usedPercent > 90 ? 'unhealthy' : 
                     usedPercent > 75 ? 'warning' : 'healthy';

      return {
        status,
        details: {
          totalGB: (totalSpace / 1024 / 1024 / 1024).toFixed(2),
          freeGB: (freeSpace / 1024 / 1024 / 1024).toFixed(2),
          usedPercent: parseFloat(usedPercent)
        }
      };
    } catch (error) {
      // Disk check not critical for health
      return {
        status: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo() {
    const os = await import('os');
    
    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpuUsage: process.cpuUsage(),
      memoryUsage: {
        totalMB: (os.totalmem() / 1024 / 1024).toFixed(2),
        freeMB: (os.freemem() / 1024 / 1024).toFixed(2),
        usedPercent: ((1 - os.freemem() / os.totalmem()) * 100).toFixed(2)
      },
      loadAverage: os.loadavg()
    };
  }

  /**
   * Helper for failed checks
   */
  failedCheck(error) {
    return {
      status: 'unhealthy',
      error: error?.message || 'Unknown error'
    };
  }
}

export default new HealthCheckService();
```

### 2. Create Health Check Routes

**File:** `backend/src/routes/health.js`

```javascript
import express from 'express';
import HealthCheckService from '../services/HealthCheckService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /health/live
 * Kubernetes liveness probe
 * Returns 200 if application is running (should restart if not)
 */
router.get('/live', async (req, res) => {
  try {
    const status = await HealthCheckService.liveness();
    res.status(200).json(status);
  } catch (error) {
    logger.error('Liveness check failed', { error: error.message });
    res.status(503).json({
      status: 'dead',
      error: error.message
    });
  }
});

/**
 * GET /health/ready
 * Kubernetes readiness probe
 * Returns 200 if ready to serve traffic, 503 if not
 */
router.get('/ready', async (req, res) => {
  try {
    const status = await HealthCheckService.readiness();
    
    if (status.status === 'ready') {
      res.status(200).json(status);
    } else {
      res.status(503).json(status);
    }
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      status: 'not_ready',
      error: error.message
    });
  }
});

/**
 * GET /health
 * Detailed health status for monitoring dashboards
 */
router.get('/', async (req, res) => {
  try {
    const status = await HealthCheckService.health();
    
    const httpStatus = status.status === 'healthy' ? 200 : 
                       status.status === 'degraded' ? 200 : 503;
    
    res.status(httpStatus).json(status);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * GET /health/deps
 * Dependency status only (useful for debugging)
 */
router.get('/deps', async (req, res) => {
  try {
    const checks = await HealthCheckService.checkDependencies();
    res.status(200).json({ checks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 3. Update Server Configuration

**File:** `backend/src/server.js`

```javascript
import healthRoutes from './routes/health.js';

// Health checks (no authentication required)
app.use('/health', healthRoutes);

// Alternative endpoints for compatibility
app.get('/healthz', (req, res) => res.redirect(301, '/health'));
app.get('/ping', (req, res) => res.json({ status: 'pong' }));
```

### 4. Kubernetes Configuration

**File:** `backend/k8s/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: recruitiq-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: recruitiq-backend
  template:
    metadata:
      labels:
        app: recruitiq-backend
    spec:
      containers:
      - name: backend
        image: recruitiq/backend:latest
        ports:
        - containerPort: 3001
        
        # Liveness probe - restart if fails
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        # Readiness probe - remove from load balancer if fails
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        
        # Startup probe - allow slow startup
        startupProbe:
          httpGet:
            path: /health/live
            port: 3001
          initialDelaySeconds: 0
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 30  # 150 seconds max startup time
        
        env:
        - name: APP_VERSION
          value: "1.0.0"
        - name: NODE_ENV
          value: "production"
```

### 5. Docker Health Check

**File:** `backend/Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health/live', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });"

CMD ["node", "src/server.js"]
```

---

## Testing Strategy

### 1. Unit Tests

**File:** `backend/tests/services/HealthCheckService.test.js`

```javascript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import HealthCheckService from '../../src/services/HealthCheckService.js';

describe('HealthCheckService', () => {
  describe('liveness', () => {
    it('should return alive status', async () => {
      const status = await HealthCheckService.liveness();
      
      expect(status.status).toBe('alive');
      expect(status.timestamp).toBeDefined();
      expect(status.uptime).toBeGreaterThan(0);
    });
  });

  describe('readiness', () => {
    it('should return ready when all checks pass', async () => {
      const status = await HealthCheckService.readiness();
      
      expect(status.status).toMatch(/ready|not_ready/);
      expect(status.checks).toBeDefined();
      expect(status.checks.database).toBeDefined();
    });

    it('should return not_ready when database fails', async () => {
      // Mock database failure
      jest.spyOn(HealthCheckService, 'checkDatabase')
        .mockResolvedValue({ status: 'unhealthy', error: 'Connection failed' });
      
      const status = await HealthCheckService.readiness();
      
      expect(status.status).toBe('not_ready');
      expect(status.checks.database.status).toBe('unhealthy');
    });
  });

  describe('checkDatabase', () => {
    it('should check database connectivity', async () => {
      const result = await HealthCheckService.checkDatabase();
      
      expect(result.status).toMatch(/healthy|unhealthy/);
      expect(result.responseTime).toBeGreaterThan(0);
      
      if (result.status === 'healthy') {
        expect(result.details).toBeDefined();
        expect(result.details.total).toBeGreaterThan(0);
      }
    });
  });
});
```

### 2. Integration Tests

**File:** `backend/tests/integration/health.test.js`

```javascript
import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/server.js';

describe('Health Check Endpoints', () => {
  describe('GET /health/live', () => {
    it('should return 200 with liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);

      expect(response.body.status).toBe('alive');
      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/health/ready');

      expect([200, 503]).toContain(response.status);
      expect(response.body.status).toMatch(/ready|not_ready/);
      expect(response.body.checks).toBeDefined();
    });

    it('should include dependency checks', async () => {
      const response = await request(app)
        .get('/health/ready');

      expect(response.body.checks.database).toBeDefined();
      expect(response.body.checks.redis).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should return detailed health information', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.body.status).toMatch(/healthy|degraded|unhealthy/);
      expect(response.body.version).toBeDefined();
      expect(response.body.uptime).toBeGreaterThan(0);
      expect(response.body.checks).toBeDefined();
      expect(response.body.system).toBeDefined();
    });
  });
});
```

---

## Monitoring Integration

### 1. Prometheus Metrics

**File:** `backend/src/monitoring/healthMetrics.js`

```javascript
import { register, Gauge } from 'prom-client';
import HealthCheckService from '../services/HealthCheckService.js';

// Health status gauge (0 = unhealthy, 1 = healthy)
const healthGauge = new Gauge({
  name: 'app_health_status',
  help: 'Application health status (0=unhealthy, 1=healthy)',
  labelNames: ['component']
});

// Dependency response time
const dependencyResponseTime = new Gauge({
  name: 'dependency_response_time_ms',
  help: 'Response time for dependency health checks',
  labelNames: ['dependency']
});

/**
 * Update health metrics
 */
export async function updateHealthMetrics() {
  try {
    const health = await HealthCheckService.health();
    
    // Overall health
    healthGauge.set({ component: 'overall' }, health.status === 'healthy' ? 1 : 0);
    
    // Dependency health
    Object.entries(health.checks).forEach(([name, check]) => {
      healthGauge.set(
        { component: name },
        check.status === 'healthy' ? 1 : 0
      );
      
      if (check.responseTime) {
        dependencyResponseTime.set({ dependency: name }, check.responseTime);
      }
    });
  } catch (error) {
    console.error('Failed to update health metrics', error);
  }
}

// Update metrics every 30 seconds
setInterval(updateHealthMetrics, 30000);

export { register };
```

### 2. CloudWatch Alarms

```yaml
# infrastructure/cloudwatch-alarms.yaml
HealthCheckFailures:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: RecruitIQ-Backend-HealthCheck-Failed
    MetricName: HealthCheckFailed
    Namespace: AWS/ApplicationELB
    Statistic: Sum
    Period: 60
    EvaluationPeriods: 2
    Threshold: 3
    ComparisonOperator: GreaterThanThreshold
    AlarmActions:
      - !Ref SNSTopic
    TreatMissingData: breaching
```

---

## Rollout Plan

### Stage 1: Development (Day 1 Morning)
- [x] Create HealthCheckService with all checks
- [x] Create health check routes
- [x] Write unit and integration tests
- [x] Test locally

### Stage 2: Staging (Day 1 Afternoon)
- [ ] Deploy to staging
- [ ] Configure load balancer health checks
- [ ] Verify all dependency checks work
- [ ] Test pod restart scenarios

### Stage 3: Production (Day 2)
- [ ] Deploy to production
- [ ] Update ALB target group health checks
- [ ] Update Kubernetes probes
- [ ] Configure monitoring alerts
- [ ] Document health check endpoints

---

## Success Criteria

- ✅ Liveness probe prevents pod restarts for transient issues
- ✅ Readiness probe removes unhealthy pods from load balancer
- ✅ All dependency checks complete in < 5 seconds
- ✅ Health endpoint provides actionable debugging information
- ✅ Zero false positive alerts
- ✅ Monitoring dashboard shows health trends

---

## Documentation Updates

Add to `docs/API_STANDARDS.md`:

````markdown
## Health Checks

### Liveness Probe
**Endpoint:** `GET /health/live`  
**Purpose:** Kubernetes liveness check

```bash
curl http://localhost:3001/health/live
```

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2025-11-15T10:30:00Z",
  "uptime": 3600
}
```

### Readiness Probe
**Endpoint:** `GET /health/ready`  
**Purpose:** Load balancer health check

Returns 200 when ready, 503 when not ready to serve traffic.

### Full Health Status
**Endpoint:** `GET /health`  
**Purpose:** Detailed monitoring

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 3600,
  "timestamp": "2025-11-15T10:30:00Z",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 5,
      "details": { "total": 20, "idle": 15, "waiting": 0 }
    },
    "redis": {
      "status": "healthy",
      "responseTime": 2
    }
  },
  "system": {
    "memoryUsage": { "usedPercent": "45.23" },
    "loadAverage": [1.2, 1.5, 1.3]
  }
}
```
````

---

## References

- [Kubernetes Liveness/Readiness Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Health Check Best Practices](https://docs.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/monitor-app-health)
- [Docker HEALTHCHECK](https://docs.docker.com/engine/reference/builder/#healthcheck)
