# Cache Implementation Plan - RecruitIQ

**Version:** 1.0  
**Date:** November 21, 2025  
**Status:** Ready for Implementation

---

## Executive Summary

This document provides a comprehensive, phased plan to implement Redis caching across the RecruitIQ platform. The implementation follows industry standards from Netflix, Stripe, Facebook, and AWS, with a focus on:

- **Performance**: 60-80% reduction in database load
- **Reliability**: Graceful degradation when Redis is unavailable
- **Security**: Multi-tenant isolation maintained in cache layer
- **Scalability**: Support for horizontal scaling

### Current State Analysis

**✅ What's Already Done:**
- Redis Docker container configured (`docker-compose.yml`)
- Basic `cacheService.js` implemented with singleton pattern
- Account lockout service using Redis for brute-force prevention
- Redis configuration in environment files

**❌ What's Missing:**
- No integration with authentication flows
- No integration with service layer (employees, departments, etc.)
- Anti-patterns in cache implementation (KEYS command, no stampede protection)
- No cache-aside pattern implementation
- No monitoring/metrics
- No cache warming strategy

---

## Table of Contents

1. [Phase 1: Foundation (Week 1)](#phase-1-foundation)
2. [Phase 2: Authentication Layer (Week 2)](#phase-2-authentication-layer)
3. [Phase 3: Core Services (Week 3-4)](#phase-3-core-services)
4. [Phase 4: Product-Specific Services (Week 5-6)](#phase-4-product-specific-services)
5. [Phase 5: Optimization & Monitoring (Week 7-8)](#phase-5-optimization--monitoring)
6. [Implementation Details](#implementation-details)
7. [Testing Strategy](#testing-strategy)
8. [Rollback Plan](#rollback-plan)

---

## Phase 1: Foundation (Week 1)

**Goal:** Fix critical anti-patterns and establish robust caching infrastructure.

### 1.1 Fix Critical Anti-Patterns in cacheService.js

#### Issue 1: KEYS Command (🔴 Critical - Blocks Redis)

**Current Code (Lines 195-207):**
```javascript
async del(key) {
  if (!this.isConnected) return false;
  
  try {
    if (key.includes('*')) {
      const keys = await this.client.keys(key); // ❌ BLOCKS REDIS!
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    }
  }
}
```

**Fix: Use SCAN Instead**
```javascript
async del(pattern) {
  if (!this.isConnected) return false;
  
  try {
    if (pattern.includes('*')) {
      // Use SCAN for non-blocking iteration
      let deletedCount = 0;
      let cursor = '0';
      
      do {
        const result = await this.client.scan(cursor, {
          MATCH: pattern,
          COUNT: 100 // Process 100 keys at a time
        });
        
        cursor = result.cursor;
        
        if (result.keys.length > 0) {
          await this.client.del(result.keys);
          deletedCount += result.keys.length;
        }
      } while (cursor !== '0');
      
      logger.debug('Cache deleted (pattern)', { 
        pattern, 
        deletedCount 
      });
      return true;
    } else {
      // Single key deletion
      const result = await this.client.del(pattern);
      logger.debug('Cache deleted', { 
        key: pattern, 
        deleted: result === 1 
      });
      return true;
    }
  } catch (error) {
    logger.error('Cache delete error', { 
      pattern, 
      error: error.message 
    });
    return false;
  }
}
```

**Priority:** 🔴 CRITICAL  
**Estimated Time:** 2 hours  
**Impact:** Prevents Redis from blocking on large datasets

#### Issue 2: Add Cache-Aside Pattern Helper

**Add New Method to cacheService.js:**
```javascript
/**
 * Cache-Aside Pattern (Read-Through Cache)
 * Industry Standard: Try cache first, fetch from source on miss, then cache result
 * 
 * Used by: Netflix, Facebook, Twitter, Stripe
 * 
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data on cache miss
 * @param {number} ttl - Time to live in seconds
 * @param {Object} options - Additional options
 * @param {boolean} options.skipCache - Force fetch from source
 * @param {boolean} options.refreshCache - Fetch and update cache
 * @returns {Promise<any>} Cached or fetched data
 */
async getOrFetch(key, fetchFn, ttl = this.defaultTTL, options = {}) {
  // Force fetch if skipCache is true
  if (options.skipCache) {
    const value = await fetchFn();
    return value;
  }
  
  // Try cache first (unless refreshing)
  if (!options.refreshCache) {
    const cached = await this.get(key);
    if (cached !== null) {
      logger.debug('Cache hit (getOrFetch)', { key });
      return cached;
    }
  }
  
  // Cache miss or refresh - fetch from source
  logger.debug('Cache miss (getOrFetch)', { key });
  
  try {
    const value = await fetchFn();
    
    // Don't cache null/undefined values
    if (value !== null && value !== undefined) {
      await this.set(key, value, ttl);
      logger.debug('Cache populated from source', { key, ttl });
    }
    
    return value;
  } catch (error) {
    logger.error('Error fetching data for cache', { 
      key, 
      error: error.message 
    });
    throw error;
  }
}
```

**Priority:** 🟡 HIGH  
**Estimated Time:** 3 hours  
**Impact:** Simplifies service layer integration

#### Issue 3: Add Cache Stampede Protection

**Add New Method to cacheService.js:**
```javascript
/**
 * Cache-Aside with Stampede Protection
 * Prevents multiple simultaneous requests from fetching the same data
 * 
 * Industry Standard: Used by Facebook, Reddit, Pinterest
 * Pattern: First request acquires lock and fetches data, others wait
 * 
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data
 * @param {number} ttl - Time to live in seconds
 * @param {Object} options - Additional options
 * @param {number} options.lockTimeout - Lock timeout in seconds (default: 10)
 * @param {number} options.maxRetries - Max retry attempts (default: 5)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 100)
 * @returns {Promise<any>} Cached or fetched data
 */
async getOrFetchWithLock(key, fetchFn, ttl = this.defaultTTL, options = {}) {
  const lockTimeout = options.lockTimeout || 10; // 10 seconds
  const maxRetries = options.maxRetries || 5;
  const retryDelay = options.retryDelay || 100; // 100ms
  
  // Try cache first
  let cached = await this.get(key);
  if (cached !== null) {
    return cached;
  }
  
  // Try to acquire lock
  const lockKey = `lock:${key}`;
  const lockValue = `${Date.now()}:${Math.random()}`;
  
  const acquired = await this.client.set(lockKey, lockValue, {
    NX: true, // Only set if doesn't exist
    EX: lockTimeout // Lock expires after timeout
  });
  
  if (acquired) {
    // This request won the race - fetch data
    try {
      logger.debug('Lock acquired, fetching data', { key });
      
      const value = await fetchFn();
      
      if (value !== null && value !== undefined) {
        await this.set(key, value, ttl);
      }
      
      return value;
    } finally {
      // Release lock (only if we still own it)
      const currentLock = await this.client.get(lockKey);
      if (currentLock === lockValue) {
        await this.client.del(lockKey);
        logger.debug('Lock released', { key });
      }
    }
  } else {
    // Another request is fetching - wait and retry
    logger.debug('Lock not acquired, waiting...', { key });
    
    for (let retry = 0; retry < maxRetries; retry++) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      // Check if data is now in cache
      cached = await this.get(key);
      if (cached !== null) {
        logger.debug('Cache populated by other request', { key, retry });
        return cached;
      }
    }
    
    // Max retries exceeded - fetch anyway to prevent deadlock
    logger.warn('Max retries exceeded, fetching without lock', { key });
    const value = await fetchFn();
    
    if (value !== null && value !== undefined) {
      await this.set(key, value, ttl);
    }
    
    return value;
  }
}
```

**Priority:** 🟡 HIGH  
**Estimated Time:** 4 hours  
**Impact:** Prevents thundering herd on cache expiration

### 1.2 Add Metrics and Monitoring

**Add New Methods to cacheService.js:**
```javascript
/**
 * Track cache operation metrics
 * Send to monitoring system (Prometheus, DataDog, etc.)
 */
async trackMetric(operation, latency, hit = null) {
  // Log metrics for monitoring systems
  const metric = {
    timestamp: new Date().toISOString(),
    operation, // 'get', 'set', 'del', 'getOrFetch'
    latency, // milliseconds
    hit, // true/false/null
    connected: this.isConnected
  };
  
  // In production, send to metrics service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to DataDog/Prometheus/CloudWatch
    // Example: await metricsClient.histogram('cache.latency', latency, { operation });
  }
  
  // Log slow operations
  if (latency > 50) { // 50ms threshold
    logger.warn('Slow cache operation', metric);
  }
}

/**
 * Enhanced get with metrics
 */
async get(key) {
  if (!this.isConnected) return null;
  
  const start = Date.now();
  
  try {
    const value = await this.client.get(key);
    const latency = Date.now() - start;
    const hit = value !== null;
    
    await this.trackMetric('get', latency, hit);
    
    if (value) {
      logger.debug('Cache hit', { key, latency });
      return JSON.parse(value);
    }
    
    logger.debug('Cache miss', { key, latency });
    return null;
  } catch (error) {
    const latency = Date.now() - start;
    await this.trackMetric('get', latency, false);
    
    logger.error('Cache get error', { key, error: error.message });
    return null;
  }
}

/**
 * Get detailed health metrics
 */
async getHealthMetrics() {
  if (!this.isConnected) {
    return {
      status: 'disconnected',
      connected: false,
      uptime: 0,
      memory: { used: 0, max: 0 },
      clients: 0,
      keys: 0
    };
  }
  
  try {
    const info = await this.client.info();
    const keyspace = await this.client.info('keyspace');
    
    // Parse Redis INFO output
    const parseInfo = (text) => {
      const lines = text.split('\r\n');
      const data = {};
      
      lines.forEach(line => {
        if (line && !line.startsWith('#')) {
          const [key, value] = line.split(':');
          if (key && value) {
            data[key] = value;
          }
        }
      });
      
      return data;
    };
    
    const serverInfo = parseInfo(info);
    const keyspaceInfo = parseInfo(keyspace);
    
    return {
      status: 'connected',
      connected: true,
      uptime: parseInt(serverInfo.uptime_in_seconds || 0),
      version: serverInfo.redis_version,
      memory: {
        used: parseInt(serverInfo.used_memory || 0),
        max: parseInt(serverInfo.maxmemory || 0),
        peak: parseInt(serverInfo.used_memory_peak || 0)
      },
      clients: parseInt(serverInfo.connected_clients || 0),
      keys: this.parseKeyspaceKeys(keyspaceInfo),
      evictions: parseInt(serverInfo.evicted_keys || 0),
      hitRate: await this.calculateHitRate(serverInfo)
    };
  } catch (error) {
    logger.error('Failed to get health metrics', { error: error.message });
    return {
      status: 'error',
      connected: this.isConnected,
      error: error.message
    };
  }
}

parseKeyspaceKeys(keyspaceInfo) {
  // Parse "db0:keys=123,expires=45"
  const db0 = keyspaceInfo.db0;
  if (!db0) return 0;
  
  const match = db0.match(/keys=(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

calculateHitRate(serverInfo) {
  const hits = parseInt(serverInfo.keyspace_hits || 0);
  const misses = parseInt(serverInfo.keyspace_misses || 0);
  const total = hits + misses;
  
  if (total === 0) return 0;
  
  return parseFloat(((hits / total) * 100).toFixed(2));
}
```

**Priority:** 🟢 MEDIUM  
**Estimated Time:** 4 hours  
**Impact:** Enables monitoring and alerting

### 1.3 Update Configuration

**Update `backend/src/config/index.js`:**
```javascript
// Redis
redis: {
  enabled: process.env.REDIS_ENABLED === 'true',
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  // NEW: Advanced configuration
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES, 10) || 3,
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) || 10000,
  commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT, 10) || 5000,
  enableOfflineQueue: process.env.REDIS_ENABLE_OFFLINE_QUEUE !== 'false',
},
```

**Priority:** 🟢 LOW  
**Estimated Time:** 1 hour

### 1.4 Integration with Server Startup

**Update `backend/src/server.js`:**
```javascript
// Add after database initialization
import cacheService from './services/cacheService.js';

// In createAndInitializeApp()
async function createAndInitializeApp() {
  await initDependencies();
  
  // Initialize cache service
  if (config.redis.enabled) {
    logger.info('🔄 Connecting to Redis cache...');
    const cacheConnected = await cacheService.connect();
    
    if (cacheConnected) {
      logger.info('✅ Cache service connected');
      
      // Get initial metrics
      const metrics = await cacheService.getHealthMetrics();
      logger.info('📊 Cache metrics:', metrics);
    } else {
      logger.warn('⚠️  Cache service unavailable - running in degraded mode');
    }
  } else {
    logger.info('ℹ️  Redis caching disabled');
  }
  
  // ... rest of initialization
}

// Add graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing connections...');
  
  // Close cache connection
  if (cacheService.isAvailable()) {
    await cacheService.close();
  }
  
  // ... close other connections
});
```

**Priority:** 🟡 HIGH  
**Estimated Time:** 2 hours

---

## Deliverables for Phase 1

- [ ] `cacheService.js` updated with SCAN instead of KEYS
- [ ] `getOrFetch()` method implemented
- [ ] `getOrFetchWithLock()` method implemented (stampede protection)
- [ ] Metrics tracking added to all cache operations
- [ ] `getHealthMetrics()` method implemented
- [ ] Server startup integration completed
- [ ] Unit tests for new cache methods (90%+ coverage)
- [ ] Documentation updated

**Total Estimated Time:** 16-20 hours (2-3 days)  
**Success Criteria:** 
- All tests passing
- No KEYS command in production code
- Cache health endpoint returns metrics
- Server starts with/without Redis successfully

---

*Continue to Phase 2 in next section...*
