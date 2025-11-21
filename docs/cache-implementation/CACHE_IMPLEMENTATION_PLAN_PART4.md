# Cache Implementation Plan - Part 4: Rollback & Quick Reference

**Continuation of:** [Part 1](./CACHE_IMPLEMENTATION_PLAN.md), [Part 2](./CACHE_IMPLEMENTATION_PLAN_PART2.md), [Part 3](./CACHE_IMPLEMENTATION_PLAN_PART3.md)

---

## Rollback Plan

### Emergency Cache Disable

If caching causes production issues, follow this immediate rollback procedure:

#### Step 1: Disable Redis (Immediate - 2 minutes)

**Option A: Environment Variable (Recommended)**

```bash
# Set environment variable
export REDIS_ENABLED=false

# Restart application
pm2 restart recruitiq-backend
```

**Option B: Emergency Configuration Override**

```javascript
// In backend/src/config/index.js
redis: {
  enabled: false, // Force disable
  // ... rest of config
}
```

#### Step 2: Verify Degraded Mode

```bash
# Check application logs
pm2 logs recruitiq-backend --lines 50

# Look for:
# "ℹ️ Redis caching disabled"
# "⚠️ Cache service unavailable - running in degraded mode"

# Test API endpoints
curl http://localhost:3001/api/auth/me
```

#### Step 3: Clear Problematic Cache (If Redis stays enabled)

```bash
# Option A: Flush specific pattern via API
curl -X DELETE \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3001/api/system/cache/invalidate/org-123

# Option B: Connect to Redis directly
redis-cli
> SCAN 0 MATCH "user:*" COUNT 100
> DEL user:123:data user:456:data
> FLUSHDB  # Nuclear option - clears entire database
> exit
```

#### Step 4: Monitor Application Health

```bash
# Check database load
curl http://localhost:3001/api/system/health

# Check error rates
curl http://localhost:3001/api/system/metrics

# Monitor logs for errors
tail -f logs/error.log
```

### Rollback Success Criteria

- ✅ Application responding normally
- ✅ Authentication working
- ✅ No increase in error rates
- ✅ Database queries executing successfully
- ✅ No cache-related errors in logs

**If issues persist:** Revert code changes via Git:

```bash
# Find last working commit
git log --oneline | head -20

# Revert to previous version
git revert <commit-hash>

# Or hard reset (use with caution!)
git reset --hard <last-good-commit>

# Redeploy
pm2 restart recruitiq-backend
```

---

## Performance Benchmarks

### Expected Improvements

**Before Caching:**

| Operation | Avg Latency | DB Queries | Throughput |
|-----------|-------------|------------|------------|
| User Login | 450ms | 5 queries | 50 req/sec |
| Employee List | 320ms | 3 queries | 60 req/sec |
| Department List | 180ms | 2 queries | 100 req/sec |
| User Profile | 250ms | 4 queries | 70 req/sec |

**After Caching (Target):**

| Operation | Avg Latency | DB Queries | Throughput | Improvement |
|-----------|-------------|------------|------------|-------------|
| User Login | 120ms | 1 query (70% cache hit) | 180 req/sec | **73% faster** |
| Employee List | 80ms | 0.6 queries | 220 req/sec | **75% faster** |
| Department List | 35ms | 0.1 queries | 400 req/sec | **81% faster** |
| User Profile | 60ms | 0.8 queries | 280 req/sec | **76% faster** |

**Overall System Impact:**
- **Database Load:** -65% (from 100% to 35%)
- **API Response Time:** -70% average
- **Throughput:** +250% (2.5x more requests)
- **Server CPU:** -20% (less database processing)
- **Memory Usage:** +150MB (Redis cache)

### Load Testing Validation

**Run load tests before and after implementation:**

```bash
# Baseline (before caching)
k6 run tests/load/scenarios/baseline.js

# After caching implementation
k6 run tests/load/scenarios/with-cache.js

# Compare results
node scripts/compare-load-tests.js baseline.json with-cache.json
```

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] All unit tests passing (90%+ coverage)
- [ ] Integration tests passing
- [ ] Load tests validate performance improvements
- [ ] Redis container running and healthy
- [ ] Cache warming tested in staging
- [ ] Monitoring dashboards configured
- [ ] Rollback plan documented and rehearsed

### Deployment Steps

1. **Deploy to Staging First**
   ```bash
   # Deploy to staging environment
   git checkout staging
   git merge develop
   npm run deploy:staging
   
   # Run smoke tests
   npm run test:smoke:staging
   
   # Monitor for 24 hours
   ```

2. **Monitor Staging Performance**
   - Check cache hit rate (target: >60%)
   - Verify database load reduction
   - Ensure no cache-related errors
   - Test cache invalidation

3. **Deploy to Production (Blue-Green)**
   ```bash
   # Deploy to blue environment (inactive)
   npm run deploy:blue
   
   # Run health checks on blue
   curl https://blue.api.recruitiq.com/health
   
   # Warm cache on blue
   curl -X POST https://blue.api.recruitiq.com/api/system/cache/warm
   
   # Switch traffic to blue
   npm run switch:blue
   
   # Monitor for 1 hour
   
   # If successful, decommission green
   # If issues, switch back to green
   npm run switch:green
   ```

4. **Post-Deployment Validation**
   ```bash
   # Check cache health
   curl https://api.recruitiq.com/api/system/cache/health
   
   # Check metrics
   curl https://api.recruitiq.com/api/system/metrics
   
   # Monitor logs
   pm2 logs --lines 100
   ```

### Post-Deployment

- [ ] Cache hit rate >60% within 1 hour
- [ ] No increase in error rates
- [ ] Response times improved by >50%
- [ ] Database load reduced by >50%
- [ ] All features working correctly
- [ ] No cache-related bugs reported

---

## Quick Reference Guide

### Common Cache Operations

```javascript
// Import cache service
import cacheService from './services/cacheService.js';

// 1. Simple get/set
await cacheService.set('key', data, 300); // 5 minutes
const data = await cacheService.get('key');

// 2. Cache-aside pattern (most common)
const data = await cacheService.getOrFetch(
  'user:123:profile',
  async () => {
    // Fetch from database
    return await db.query('SELECT ...');
  },
  300 // TTL in seconds
);

// 3. With stampede protection (for expensive operations)
const data = await cacheService.getOrFetchWithLock(
  'report:monthly:org-123',
  async () => {
    // Generate expensive report
    return await generateReport();
  },
  3600 // 1 hour
);

// 4. Delete cache
await cacheService.del('user:123:profile');

// 5. Delete by pattern
await cacheService.del('user:*'); // Deletes all user keys

// 6. Check if key exists
const exists = await cacheService.exists('key');

// 7. Invalidate user (deletes all user-related caches)
await cacheService.invalidateUser(userId);

// 8. Invalidate organization
await cacheService.invalidateOrganization(organizationId);
```

### Cache Key Naming Conventions

**Pattern:** `{scope}:{entity}:{id}:{attribute}`

```javascript
// User caches
`user:${userId}:profile`
`user:${userId}:permissions`
`user:email:${email}:${orgId}`
`jwt:template:${userId}:${orgId}`

// Organization caches
`org:${orgId}:settings`
`org:${orgId}:employees`
`org:${orgId}:employees:${filterHash}`
`org:${orgId}:departments`
`org:${orgId}:locations`

// Product-specific caches
`org:${orgId}:paylinq:runtype:${code}`
`org:${orgId}:paylinq:runtypes:${filterHash}`
`org:${orgId}:schedulehub:stations`
`org:${orgId}:nexus:employee:${employeeId}`

// Session/token caches
`session:${sessionId}:data`
`token:blacklist:${tokenId}`

// Lock keys (for stampede protection)
`lock:${originalKey}`
```

### TTL Guidelines

```javascript
// In cacheService.js
const TTL = {
  // Authentication
  USER_DATA: 5 * 60,        // 5 minutes (changes frequently)
  JWT_TEMPLATE: 15 * 60,    // 15 minutes (aligns with JWT expiry)
  SESSION: 15 * 60,         // 15 minutes
  
  // Reference Data (rarely changes)
  DEPARTMENTS: 60 * 60,     // 1 hour
  LOCATIONS: 60 * 60,       // 1 hour
  PAYROLL_RUN_TYPES: 60 * 60, // 1 hour
  WORKER_TYPES: 60 * 60,    // 1 hour
  
  // Dynamic Data
  EMPLOYEE_LIST: 5 * 60,    // 5 minutes
  EMPLOYEE_DETAIL: 10 * 60, // 10 minutes
  ORGANIZATION_SETTINGS: 15 * 60, // 15 minutes
  
  // Search Results
  SEARCH_RESULTS: 2 * 60,   // 2 minutes (very dynamic)
  
  // Reports
  REPORTS: 30 * 60,         // 30 minutes
};
```

### When to Invalidate Cache

**MUST Invalidate:**
- ✅ After UPDATE operations
- ✅ After DELETE operations
- ✅ After user role/permission changes
- ✅ After organization settings changes
- ✅ When data affects other cached items

**Don't Need to Invalidate:**
- ❌ After SELECT operations (read-only)
- ❌ After non-critical updates (last_login_at)
- ❌ When cache will naturally expire soon
- ❌ When data is already stale

**Example Pattern:**

```javascript
async updateEmployee(id, data, organizationId, userId) {
  // 1. Update database
  const updated = await this.repository.update(id, data, organizationId, userId);
  
  // 2. Invalidate specific employee cache
  await cacheService.del(this.getEmployeeCacheKey(id, organizationId));
  
  // 3. Invalidate list caches (employee appears in lists)
  await cacheService.del(`org:${organizationId}:employees:*`);
  
  // 4. If department changed, invalidate department caches too
  if (data.department_id) {
    await cacheService.del(`org:${organizationId}:departments:employees:*`);
  }
  
  return updated;
}
```

---

## Troubleshooting Guide

### Issue: Low Cache Hit Rate (<40%)

**Diagnosis:**
```javascript
// Check cache health
const health = await cacheService.getHealthMetrics();
console.log('Hit Rate:', health.hitRate);
console.log('Total Keys:', health.keys);
```

**Possible Causes:**
1. TTL too short - cache expiring too quickly
2. Cache keys include timestamps/random values
3. Too many unique filter combinations
4. Cache invalidation too aggressive

**Solutions:**
```javascript
// Increase TTL for stable data
await cacheService.set(key, data, 3600); // 1 hour instead of 5 min

// Use consistent cache keys
const cacheKey = `org:${orgId}:employees`; // ✅ Good
const cacheKey = `org:${orgId}:employees:${Date.now()}`; // ❌ Bad

// Only cache common filters
if (isCommonFilter(filters)) {
  return cacheService.getOrFetch(key, fetchFn, ttl);
} else {
  return fetchFn(); // Skip cache for rare filters
}
```

### Issue: Stale Data Returned

**Diagnosis:**
```javascript
// Check if cache invalidation is working
await employeeService.updateEmployee(id, data, orgId, userId);

// Immediately check cache
const cached = await cacheService.get(`org:${orgId}:employee:${id}`);
console.log('Cached data after update:', cached); // Should be null
```

**Possible Causes:**
1. Missing cache invalidation after updates
2. Wrong cache key in invalidation
3. Pattern matching not working

**Solutions:**
```javascript
// Always invalidate after updates
async update(id, data, orgId, userId) {
  const updated = await this.repository.update(id, data, orgId, userId);
  
  // CRITICAL: Add invalidation
  await cacheService.del(this.getCacheKey(id, orgId));
  
  return updated;
}

// Use consistent keys
const cacheKey = this.getCacheKey(id, orgId); // Reuse same function
await cacheService.set(cacheKey, data, ttl);
// ... later
await cacheService.del(cacheKey); // Same key guaranteed
```

### Issue: Redis Connection Lost

**Diagnosis:**
```bash
# Check Redis status
redis-cli ping
# Should return: PONG

# Check Docker container
docker ps | grep redis

# Check application logs
pm2 logs | grep -i redis
```

**Solutions:**
```bash
# Restart Redis container
docker restart redis

# Or restart via docker-compose
cd backend
docker-compose restart redis

# Application should auto-reconnect (check logs)
# Look for: "✅ Redis reconnected"
```

### Issue: Memory Usage High

**Diagnosis:**
```javascript
const health = await cacheService.getHealthMetrics();
console.log('Memory Used:', health.memory.used);
console.log('Max Memory:', health.memory.max);
console.log('Total Keys:', health.keys);
console.log('Evictions:', health.evictions);
```

**Possible Causes:**
1. TTL too long - data not expiring
2. Too many keys cached
3. Large objects cached
4. Memory limit too low

**Solutions:**
```javascript
// Reduce TTL for large datasets
await cacheService.set(key, largeData, 300); // 5 min instead of 1 hour

// Don't cache large result sets
if (results.length > 1000) {
  return results; // Skip cache
}

// Increase Redis memory limit
// In docker-compose.yml:
services:
  redis:
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

---

## Success Metrics

### Key Performance Indicators (KPIs)

**Week 1-2 (Foundation + Auth):**
- [ ] Redis connection stable (99.9% uptime)
- [ ] KEYS command eliminated (0 usage)
- [ ] Auth cache hit rate >70%
- [ ] Login response time reduced by >60%

**Week 3-4 (Core Services):**
- [ ] Employee service cache hit rate >60%
- [ ] Department/location cache hit rate >80%
- [ ] Database query count reduced by >50%
- [ ] API response times improved by >50%

**Week 5-6 (Product Services):**
- [ ] PayLinQ cache hit rate >65%
- [ ] ScheduleHub cache hit rate >65%
- [ ] Overall cache hit rate >60%
- [ ] Server CPU usage reduced by >15%

**Week 7-8 (Optimization):**
- [ ] Cache warming reduces cold start time by >50%
- [ ] Monitoring dashboard operational
- [ ] Zero cache-related production incidents
- [ ] Load tests show 2x throughput improvement

---

## Additional Resources

### Industry References

**Netflix Caching Strategy:**
- Use cache-aside pattern for reads
- Write-through for critical data
- Stampede protection for expensive operations
- Monitor cache hit rates obsessively

**Stripe Caching Patterns:**
- Cache user sessions aggressively
- Cache API responses for idempotent requests
- Use Redis pub/sub for cache invalidation
- Implement circuit breakers for cache failures

**Facebook Caching Architecture:**
- Multi-tier caching (L1: local, L2: Redis, L3: DB)
- Lease-based cache invalidation
- TAO (The Associations and Objects) system
- Cache warming on deployment

### Recommended Reading

1. **"Caching at Scale" by Netflix Tech Blog**
   - https://netflixtechblog.com/

2. **"Redis Best Practices" by Redis Labs**
   - https://redis.io/docs/manual/patterns/

3. **"The Architecture of Open Source Applications - Redis"**
   - http://aosabook.org/en/redis.html

4. **"Scaling Redis at Twitter"**
   - https://blog.twitter.com/engineering/

---

## Appendix: Cache Service API Reference

### Full Method List

```javascript
// Connection Management
await cacheService.connect()
await cacheService.close()
cacheService.isAvailable()
cacheService.isConnected

// Basic Operations
await cacheService.set(key, value, ttl)
await cacheService.get(key)
await cacheService.del(keyOrPattern)
await cacheService.exists(key)
await cacheService.flush()

// Cache-Aside Pattern
await cacheService.getOrFetch(key, fetchFn, ttl, options)
await cacheService.getOrFetchWithLock(key, fetchFn, ttl, options)

// Batch Operations
await cacheService.mget(keys)
await cacheService.mset(keyValuePairs, ttl)

// Invalidation Helpers
await cacheService.invalidateUser(userId)
await cacheService.invalidateOrganization(organizationId)

// Key Generators
cacheService.getUserByIdKey(id, orgId)
cacheService.getUserByEmailKey(email, orgId)
cacheService.getJWTTemplateKey(userId, orgId)
cacheService.getDepartmentsKey(orgId, filters)
cacheService.getLocationsKey(orgId, filters)

// Monitoring
await cacheService.getHealthMetrics()
await cacheService.getStats()

// TTL Constants
cacheService.TTL.USER_DATA          // 300s (5 min)
cacheService.TTL.JWT_TEMPLATE       // 900s (15 min)
cacheService.TTL.DEPARTMENTS        // 3600s (1 hour)
cacheService.TTL.LOCATIONS          // 3600s (1 hour)
cacheService.TTL.EMPLOYEE_LIST      // 300s (5 min)
```

---

## Summary

### Implementation Timeline

| Phase | Duration | Effort | Priority | Impact |
|-------|----------|--------|----------|--------|
| Phase 1: Foundation | Week 1 | 16-20h | 🔴 Critical | Anti-patterns fixed |
| Phase 2: Authentication | Week 2 | 21-25h | 🔴 Critical | 70% DB load reduction |
| Phase 3: Core Services | Week 3-4 | 30-35h | 🟡 High | 60% query reduction |
| Phase 4: Product Services | Week 5-6 | 25-30h | 🟡 High | Product optimization |
| Phase 5: Optimization | Week 7-8 | 15-20h | 🟢 Medium | Monitoring & tuning |

**Total Estimated Effort:** 107-130 hours (13-16 days)

### Expected ROI

**Performance Gains:**
- 70% faster authentication
- 60% reduction in database queries
- 250% increase in throughput
- 50-75% improvement in API response times

**Infrastructure Savings:**
- 40% reduction in database server load
- Ability to handle 2.5x more users on same hardware
- Reduced database instance size needed
- Lower cloud costs from reduced DB usage

**Developer Experience:**
- Faster local development (less DB queries)
- Better production reliability
- Easier debugging with cache metrics
- Improved testing performance

---

**Implementation Status:** ⚪ NOT STARTED  
**Next Steps:** Review plan with team → Begin Phase 1 → Test in staging → Deploy to production

**Questions or Issues?** Contact: [DevOps Team] or [Backend Lead]

---

*End of Cache Implementation Plan*
