# Cache Implementation Plan - Part 3: Testing, Monitoring & Production

**Continuation of:** [CACHE_IMPLEMENTATION_PLAN.md](./CACHE_IMPLEMENTATION_PLAN.md) and [Part 2](./CACHE_IMPLEMENTATION_PLAN_PART2.md)

---

## Phase 4: Product-Specific Services (Week 5-6)

**Goal:** Extend caching to high-traffic product services.

### 4.1 PayLinQ Service Caching

**Services to cache (priority order):**

1. **PayrollRunType Service** (HIGH)
   - Run types are reference data - cache for 1 hour
   - ~90% cache hit rate expected

2. **WorkerType Service** (HIGH)
   - Worker type templates rarely change
   - Cache for 1 hour

3. **PayComponent Service** (MEDIUM)
   - Pay components (allowances, deductions)
   - Cache for 15 minutes (change more frequently)

**Example Implementation:**

**File: `backend/src/products/paylinq/services/PayrollRunTypeService.js`**

```javascript
import cacheService from '../../../services/cacheService.js';

class PayrollRunTypeService {
  
  getRunTypeCacheKey(code, organizationId) {
    return `org:${organizationId}:paylinq:runtype:${code}`;
  }
  
  getRunTypeListCacheKey(organizationId, filters = {}) {
    const filterKey = JSON.stringify(filters);
    return `org:${organizationId}:paylinq:runtypes:${filterKey}`;
  }
  
  /**
   * Get payroll run type by code with caching
   */
  async getByCode(code, organizationId) {
    const cacheKey = this.getRunTypeCacheKey(code, organizationId);
    
    return cacheService.getOrFetch(
      cacheKey,
      async () => {
        const result = await this.repository.findByCode(code, organizationId);
        if (!result) {
          throw new Error(`Payroll run type ${code} not found`);
        }
        return mapRunTypeDbToApi(result);
      },
      3600 // 1 hour - run types are fairly static
    );
  }
  
  /**
   * List run types with caching
   */
  async list(organizationId, filters = {}) {
    const cacheKey = this.getRunTypeListCacheKey(organizationId, filters);
    
    return cacheService.getOrFetch(
      cacheKey,
      async () => {
        const results = await this.repository.findAll(organizationId, filters);
        return mapRunTypesDbToApi(results);
      },
      3600 // 1 hour
    );
  }
  
  /**
   * Update run type - invalidate cache
   */
  async update(code, data, organizationId, userId) {
    const updated = await this.repository.update(code, data, organizationId, userId);
    
    // Invalidate specific run type and all lists
    await cacheService.del(this.getRunTypeCacheKey(code, organizationId));
    await cacheService.del(`org:${organizationId}:paylinq:runtypes:*`);
    
    return mapRunTypeDbToApi(updated);
  }
}
```

**Priority:** 🟡 HIGH  
**Estimated Time:** 8 hours (for 3 services)  
**Impact:** 70% reduction in PayLinQ reference data queries

### 4.2 ScheduleHub Service Caching

**Services to cache:**

1. **Station Service** - Stations are fairly static
2. **Role Service** - Shift roles rarely change
3. **Schedule Templates** - Template definitions

**Cache Strategy:**
- Station data: 1 hour TTL
- Role data: 1 hour TTL
- Schedule templates: 30 minutes TTL
- Active schedules: 5 minutes TTL (change frequently)

**File: `backend/src/products/schedulehub/services/stationService.js`**

```javascript
class StationService {
  async listStations(organizationId) {
    const cacheKey = `org:${organizationId}:schedulehub:stations`;
    
    return cacheService.getOrFetch(
      cacheKey,
      async () => {
        const results = await this.repository.findAll(organizationId);
        return mapStationsDbToApi(results);
      },
      3600 // 1 hour
    );
  }
  
  async updateStation(id, data, organizationId, userId) {
    const updated = await this.repository.update(id, data, organizationId, userId);
    
    // Invalidate all station caches
    await cacheService.del(`org:${organizationId}:schedulehub:stations`);
    
    return mapStationDbToApi(updated);
  }
}
```

**Priority:** 🟢 MEDIUM  
**Estimated Time:** 6 hours  
**Impact:** 65% reduction in ScheduleHub reference data queries

### 4.3 Selective Caching Strategy

**What TO cache:**
- ✅ User authentication data (5 min TTL)
- ✅ Reference data: departments, locations, stations (1 hour TTL)
- ✅ Employee lists (5 min TTL)
- ✅ Payroll run types (1 hour TTL)
- ✅ Worker type templates (1 hour TTL)
- ✅ Organization settings (15 min TTL)

**What NOT to cache:**
- ❌ Time-sensitive data: clock-in/out records
- ❌ Financial transactions: payroll runs, payments
- ❌ Frequently changing: schedules, shift assignments
- ❌ Large result sets: full employee history
- ❌ User-specific complex filters

**Cache Decision Matrix:**

| Data Type | Change Frequency | Cache? | TTL | Reason |
|-----------|-----------------|--------|-----|--------|
| User profile | Low | ✅ Yes | 5 min | High read volume |
| Departments | Very Low | ✅ Yes | 1 hour | Rarely change |
| Locations | Very Low | ✅ Yes | 1 hour | Rarely change |
| Employees | Medium | ✅ Yes | 5 min | High read, moderate change |
| Payroll runs | High | ❌ No | - | Frequent updates |
| Clock records | Very High | ❌ No | - | Real-time data |
| Search results | Varies | ⚠️ Conditional | 2 min | Only common searches |

---

## Phase 5: Monitoring & Optimization (Week 7-8)

### 5.1 Cache Health Monitoring Endpoint

**Create health check endpoint:**

**File: `backend/src/routes/system/systemRoutes.js`**

```javascript
import express from 'express';
import cacheService from '../../services/cacheService.js';
import { authenticatePlatform } from '../../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/system/cache/health
 * Returns cache health metrics
 * Requires platform admin authentication
 */
router.get('/cache/health', authenticatePlatform, async (req, res) => {
  try {
    const health = await cacheService.getHealthMetrics();
    
    return res.json({
      success: true,
      cache: health
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get cache health',
      details: error.message
    });
  }
});

/**
 * GET /api/system/cache/stats
 * Returns detailed cache statistics
 */
router.get('/cache/stats', authenticatePlatform, async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    
    return res.json({
      success: true,
      stats
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get cache stats'
    });
  }
});

/**
 * POST /api/system/cache/flush
 * Flush entire cache (use with caution!)
 * Requires superadmin role
 */
router.post('/cache/flush', authenticatePlatform, async (req, res) => {
  try {
    // Check if user is superadmin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Only superadmins can flush cache'
      });
    }
    
    await cacheService.flush();
    
    logger.warn('Cache flushed by admin', { 
      adminId: req.user.id,
      adminEmail: req.user.email 
    });
    
    return res.json({
      success: true,
      message: 'Cache flushed successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to flush cache'
    });
  }
});

/**
 * DELETE /api/system/cache/invalidate/:organizationId
 * Invalidate all cache for an organization
 */
router.delete('/cache/invalidate/:organizationId', authenticatePlatform, async (req, res) => {
  try {
    const { organizationId } = req.params;
    
    await cacheService.invalidateOrganization(organizationId);
    
    logger.info('Organization cache invalidated', { 
      organizationId,
      adminId: req.user.id 
    });
    
    return res.json({
      success: true,
      message: `Cache invalidated for organization ${organizationId}`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to invalidate organization cache'
    });
  }
});

export default router;
```

**Priority:** 🟡 HIGH  
**Estimated Time:** 3 hours

### 5.2 Prometheus Metrics Integration

**Add Prometheus-compatible metrics endpoint:**

**File: `backend/src/services/metricsService.js`**

```javascript
import cacheService from './cacheService.js';

class MetricsService {
  constructor() {
    this.metrics = {
      cache_hits_total: 0,
      cache_misses_total: 0,
      cache_get_duration_seconds: [],
      cache_set_duration_seconds: [],
      cache_keys_total: 0,
      cache_memory_bytes: 0,
      cache_evictions_total: 0
    };
    
    // Update metrics every 60 seconds
    this.startMetricsCollection();
  }
  
  startMetricsCollection() {
    setInterval(async () => {
      try {
        const health = await cacheService.getHealthMetrics();
        const stats = await cacheService.getStats();
        
        // Update metrics
        this.metrics.cache_hits_total = stats.hits || 0;
        this.metrics.cache_misses_total = stats.misses || 0;
        this.metrics.cache_keys_total = health.keys || 0;
        this.metrics.cache_memory_bytes = health.memory?.used || 0;
        this.metrics.cache_evictions_total = health.evictions || 0;
      } catch (error) {
        logger.error('Failed to collect cache metrics', { error: error.message });
      }
    }, 60000); // Every minute
  }
  
  /**
   * Export metrics in Prometheus format
   */
  getPrometheusMetrics() {
    return `
# HELP cache_hits_total Total number of cache hits
# TYPE cache_hits_total counter
cache_hits_total ${this.metrics.cache_hits_total}

# HELP cache_misses_total Total number of cache misses
# TYPE cache_misses_total counter
cache_misses_total ${this.metrics.cache_misses_total}

# HELP cache_keys_total Total number of keys in cache
# TYPE cache_keys_total gauge
cache_keys_total ${this.metrics.cache_keys_total}

# HELP cache_memory_bytes Memory used by cache in bytes
# TYPE cache_memory_bytes gauge
cache_memory_bytes ${this.metrics.cache_memory_bytes}

# HELP cache_evictions_total Total number of evicted keys
# TYPE cache_evictions_total counter
cache_evictions_total ${this.metrics.cache_evictions_total}

# HELP cache_hit_rate Percentage of cache hits
# TYPE cache_hit_rate gauge
cache_hit_rate ${this.calculateHitRate()}
`.trim();
  }
  
  calculateHitRate() {
    const total = this.metrics.cache_hits_total + this.metrics.cache_misses_total;
    if (total === 0) return 0;
    return (this.metrics.cache_hits_total / total * 100).toFixed(2);
  }
}

export default new MetricsService();
```

**Add metrics endpoint:**

```javascript
// In systemRoutes.js
router.get('/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(metricsService.getPrometheusMetrics());
});
```

**Priority:** 🟢 MEDIUM  
**Estimated Time:** 4 hours

### 5.3 Cache Warming on Startup

**Pre-populate cache with frequently accessed data:**

**File: `backend/src/services/cacheWarmingService.js`**

```javascript
import cacheService from './cacheService.js';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

class CacheWarmingService {
  
  /**
   * Warm cache on application startup
   * Pre-loads frequently accessed data
   */
  async warmCache() {
    if (!cacheService.isAvailable()) {
      logger.info('Cache warming skipped - Redis not available');
      return;
    }
    
    logger.info('🔥 Starting cache warming...');
    
    const startTime = Date.now();
    let warmedKeys = 0;
    
    try {
      // Warm organization settings
      warmedKeys += await this.warmOrganizationSettings();
      
      // Warm department data (all orgs)
      warmedKeys += await this.warmDepartments();
      
      // Warm location data (all orgs)
      warmedKeys += await this.warmLocations();
      
      // Warm payroll run types
      warmedKeys += await this.warmPayrollRunTypes();
      
      const duration = Date.now() - startTime;
      logger.info(`✅ Cache warming completed`, { 
        warmedKeys, 
        duration: `${duration}ms` 
      });
    } catch (error) {
      logger.error('Cache warming failed', { error: error.message });
    }
  }
  
  async warmOrganizationSettings() {
    try {
      const result = await query(`
        SELECT id, name, tier, settings 
        FROM organizations 
        WHERE deleted_at IS NULL
      `);
      
      for (const org of result.rows) {
        const key = `org:${org.id}:settings`;
        await cacheService.set(key, org, cacheService.TTL.DEPARTMENTS);
      }
      
      logger.info(`Warmed ${result.rows.length} organization settings`);
      return result.rows.length;
    } catch (error) {
      logger.error('Failed to warm organization settings', { error: error.message });
      return 0;
    }
  }
  
  async warmDepartments() {
    try {
      const result = await query(`
        SELECT organization_id, 
               json_agg(json_build_object(
                 'id', id,
                 'name', name,
                 'code', code
               )) as departments
        FROM hris.department
        WHERE deleted_at IS NULL
        GROUP BY organization_id
      `);
      
      for (const row of result.rows) {
        const key = cacheService.getDepartmentsKey(row.organization_id, {});
        await cacheService.set(key, row.departments, cacheService.TTL.DEPARTMENTS);
      }
      
      logger.info(`Warmed departments for ${result.rows.length} organizations`);
      return result.rows.length;
    } catch (error) {
      logger.error('Failed to warm departments', { error: error.message });
      return 0;
    }
  }
  
  async warmLocations() {
    try {
      const result = await query(`
        SELECT organization_id,
               json_agg(json_build_object(
                 'id', id,
                 'name', name,
                 'address', address
               )) as locations
        FROM hris.location
        WHERE deleted_at IS NULL
        GROUP BY organization_id
      `);
      
      for (const row of result.rows) {
        const key = cacheService.getLocationsKey(row.organization_id, {});
        await cacheService.set(key, row.locations, cacheService.TTL.LOCATIONS);
      }
      
      logger.info(`Warmed locations for ${result.rows.length} organizations`);
      return result.rows.length;
    } catch (error) {
      logger.error('Failed to warm locations', { error: error.message });
      return 0;
    }
  }
  
  async warmPayrollRunTypes() {
    try {
      const result = await query(`
        SELECT organization_id,
               json_agg(json_build_object(
                 'id', id,
                 'type_code', type_code,
                 'type_name', type_name
               )) as run_types
        FROM paylinq.payroll_run_types
        WHERE deleted_at IS NULL
        GROUP BY organization_id
      `);
      
      for (const row of result.rows) {
        const key = `org:${row.organization_id}:paylinq:runtypes:{}`;
        await cacheService.set(key, row.run_types, 3600);
      }
      
      logger.info(`Warmed payroll run types for ${result.rows.length} organizations`);
      return result.rows.length;
    } catch (error) {
      logger.error('Failed to warm payroll run types', { error: error.message });
      return 0;
    }
  }
}

export default new CacheWarmingService();
```

**Integrate with server startup:**

```javascript
// In backend/src/server.js
import cacheWarmingService from './services/cacheWarmingService.js';

async function createAndInitializeApp() {
  // ... after cache connection
  
  if (cacheService.isAvailable()) {
    // Warm cache in background (don't block startup)
    cacheWarmingService.warmCache().catch(err => {
      logger.error('Cache warming failed', { error: err.message });
    });
  }
  
  // ... continue initialization
}
```

**Priority:** 🟢 MEDIUM  
**Estimated Time:** 4 hours  
**Impact:** Reduces initial cache misses by 80%

---

## Testing Strategy

### Unit Tests for cacheService

**File: `backend/tests/unit/services/cacheService.test.js`**

```javascript
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import cacheService from '../../../src/services/cacheService.js';

describe('CacheService', () => {
  
  beforeEach(async () => {
    // Connect to test Redis
    await cacheService.connect();
    await cacheService.flush();
  });
  
  afterEach(async () => {
    await cacheService.flush();
  });
  
  describe('get/set', () => {
    it('should store and retrieve data', async () => {
      const key = 'test:key';
      const value = { name: 'John Doe', age: 30 };
      
      await cacheService.set(key, value, 60);
      
      const retrieved = await cacheService.get(key);
      
      expect(retrieved).toEqual(value);
    });
    
    it('should return null for non-existent keys', async () => {
      const value = await cacheService.get('nonexistent:key');
      expect(value).toBeNull();
    });
    
    it('should expire keys after TTL', async () => {
      const key = 'test:expire';
      await cacheService.set(key, 'value', 1); // 1 second TTL
      
      // Wait 1.5 seconds
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const value = await cacheService.get(key);
      expect(value).toBeNull();
    });
  });
  
  describe('del', () => {
    it('should delete single keys', async () => {
      await cacheService.set('test:key', 'value', 60);
      await cacheService.del('test:key');
      
      const value = await cacheService.get('test:key');
      expect(value).toBeNull();
    });
    
    it('should delete keys by pattern using SCAN', async () => {
      // Create multiple keys
      await cacheService.set('user:1:data', 'user1', 60);
      await cacheService.set('user:2:data', 'user2', 60);
      await cacheService.set('user:3:data', 'user3', 60);
      await cacheService.set('org:1:data', 'org1', 60);
      
      // Delete user:* pattern
      await cacheService.del('user:*');
      
      // Verify user keys deleted
      expect(await cacheService.get('user:1:data')).toBeNull();
      expect(await cacheService.get('user:2:data')).toBeNull();
      expect(await cacheService.get('user:3:data')).toBeNull();
      
      // Verify org key still exists
      expect(await cacheService.get('org:1:data')).toBe('org1');
    });
  });
  
  describe('getOrFetch', () => {
    it('should fetch on cache miss', async () => {
      const key = 'test:fetch';
      const fetchFn = jest.fn().mockResolvedValue({ data: 'fetched' });
      
      const result = await cacheService.getOrFetch(key, fetchFn, 60);
      
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: 'fetched' });
      
      // Verify cached
      const cached = await cacheService.get(key);
      expect(cached).toEqual({ data: 'fetched' });
    });
    
    it('should return cached value without fetching', async () => {
      const key = 'test:cached';
      await cacheService.set(key, { data: 'cached' }, 60);
      
      const fetchFn = jest.fn();
      
      const result = await cacheService.getOrFetch(key, fetchFn, 60);
      
      expect(fetchFn).not.toHaveBeenCalled();
      expect(result).toEqual({ data: 'cached' });
    });
  });
  
  describe('getOrFetchWithLock', () => {
    it('should prevent cache stampede', async () => {
      const key = 'test:stampede';
      let fetchCount = 0;
      
      const fetchFn = jest.fn(async () => {
        fetchCount++;
        // Simulate slow fetch
        await new Promise(resolve => setTimeout(resolve, 100));
        return { data: 'fetched' };
      });
      
      // Simulate 10 concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        cacheService.getOrFetchWithLock(key, fetchFn, 60)
      );
      
      const results = await Promise.all(promises);
      
      // All requests should get the same data
      results.forEach(result => {
        expect(result).toEqual({ data: 'fetched' });
      });
      
      // Fetch should only be called once (lock worked)
      expect(fetchCount).toBe(1);
    });
  });
  
  describe('invalidateUser', () => {
    it('should delete all user-related caches', async () => {
      const userId = 'user-123';
      const orgId = 'org-456';
      
      // Create user-related keys
      await cacheService.set(`user:${userId}:data`, 'data1', 60);
      await cacheService.set(`user:email:test@example.com:${userId}`, 'data2', 60);
      await cacheService.set(`jwt:template:${userId}:${orgId}`, 'data3', 60);
      await cacheService.set(`session:abc:${userId}`, 'data4', 60);
      
      // Invalidate user
      await cacheService.invalidateUser(userId);
      
      // Verify all deleted
      expect(await cacheService.get(`user:${userId}:data`)).toBeNull();
      expect(await cacheService.get(`jwt:template:${userId}:${orgId}`)).toBeNull();
    });
  });
});
```

**Priority:** 🔴 CRITICAL  
**Estimated Time:** 6 hours  
**Impact:** Ensures cache reliability

### Integration Tests

**File: `backend/tests/integration/cache-integration.test.js`**

```javascript
describe('Cache Integration Tests', () => {
  
  it('should cache user lookups during authentication', async () => {
    // First login - cache miss
    const response1 = await request(app)
      .post('/api/auth/tenant/login')
      .send({ email: 'test@example.com', password: 'password123' });
    
    expect(response1.status).toBe(200);
    
    // Second login - cache hit (should be faster)
    const start = Date.now();
    const response2 = await request(app)
      .post('/api/auth/tenant/login')
      .send({ email: 'test@example.com', password: 'password123' });
    const duration = Date.now() - start;
    
    expect(response2.status).toBe(200);
    expect(duration).toBeLessThan(100); // Should be fast from cache
  });
  
  it('should invalidate cache on user update', async () => {
    // Get user (populate cache)
    await employeeService.getEmployeeById(employeeId, orgId);
    
    // Verify cached
    const cacheKey = `org:${orgId}:employee:${employeeId}`;
    let cached = await cacheService.get(cacheKey);
    expect(cached).not.toBeNull();
    
    // Update user
    await employeeService.updateEmployee(
      employeeId, 
      { first_name: 'Updated' }, 
      orgId, 
      userId
    );
    
    // Verify cache invalidated
    cached = await cacheService.get(cacheKey);
    expect(cached).toBeNull();
  });
});
```

---

*Continue to Rollback Plan in next section...*
