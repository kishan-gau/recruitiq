# API Rate Limiting Documentation

## Overview

This document describes the enhanced rate limiting system implemented in RecruitIQ, featuring Redis-based distributed rate limiting, role-based limits, and comprehensive monitoring.

## Architecture

### Rate Limiting Strategy

The system implements a **multi-tier rate limiting strategy**:

1. **Global Rate Limiting**: Applies to all API endpoints
2. **Authentication Rate Limiting**: Strict limits on auth endpoints to prevent brute force
3. **Endpoint-Specific Limits**: Custom limits for resource-intensive operations
4. **Role-Based Limits**: Different limits based on user roles
5. **Public API Limits**: Special limits for unauthenticated public endpoints

### Storage Backend

- **Development**: In-memory store (fast, but not shared across instances)
- **Production**: Redis store (distributed, persistent, scalable)

The system automatically falls back to memory storage if Redis is unavailable.

## Rate Limit Tiers

### Default Rate Limiters

| Limiter | Window | Max Requests | Applied To | Key |
|---------|--------|--------------|------------|-----|
| **Global** | 15 min | 100 | All `/api/*` routes | IP or User ID |
| **Auth** | 15 min | 5 | Login, Register, Password Reset | IP |
| **API** | 1 hour | 1,000 | Authenticated endpoints | User ID |
| **Heavy** | 1 hour | 10 | Resource-intensive ops | User ID |
| **Public** | 15 min | 50 | Public endpoints | IP |
| **Application** | 1 hour | 5 | Job applications | Email or IP |
| **Upload** | 1 hour | 20 | File uploads | User ID |

### Role-Based Limits (per hour)

| Role | Requests/Hour | Use Case |
|------|---------------|----------|
| **Admin** | 10,000 | System administrators |
| **Recruiter** | 5,000 | Recruiters managing candidates |
| **Hiring Manager** | 2,000 | Hiring managers reviewing |
| **Member** | 1,000 | Regular team members |
| **Unauthenticated** | 100 | Public API access |

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_ENABLED=true                    # Enable Redis for distributed rate limiting
REDIS_URL=redis://localhost:6379     # Redis connection URL
REDIS_PASSWORD=your_password          # Redis password (if required)
REDIS_DB=0                            # Redis database number

# Rate Limit Configuration (Legacy - still supported)
RATE_LIMIT_WINDOW_MS=900000          # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100          # Maximum requests per window

# Proxy Configuration (important for correct IP detection)
TRUST_PROXY=true                      # Trust X-Forwarded-For header
```

### Redis Setup

#### Local Development (Docker)

```bash
# Start Redis container
docker run -d \\
  --name redis-ratelimit \\
  -p 6379:6379 \\
  redis:7-alpine

# Verify Redis is running
docker exec redis-ratelimit redis-cli ping
# Should return: PONG
```

#### Production (AWS ElastiCache, Azure Cache, etc.)

```bash
# AWS ElastiCache example
REDIS_ENABLED=true
REDIS_URL=redis://your-cluster.cache.amazonaws.com:6379
REDIS_PASSWORD=your-password
```

## Usage Examples

### 1. Using Pre-configured Limiters

```javascript
import { 
  globalLimiter, 
  authLimiter, 
  uploadLimiter,
  publicLimiter 
} from '../middleware/rateLimit.js';

// Apply global rate limiter to all routes
app.use('/api/', globalLimiter);

// Apply stricter limits to auth routes
router.post('/login', authLimiter, loginController);
router.post('/register', authLimiter, registerController);

// Apply upload limiter to file upload routes
router.post('/upload', uploadLimiter, uploadController);

// Apply public limiter to public endpoints
router.get('/public/jobs', publicLimiter, getPublicJobs);
```

### 2. Role-Based Rate Limiting

```javascript
import { createRoleBasedLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';

// Create role-based limiter with custom limits
const roleLimiter = createRoleBasedLimiter({
  admin: 10000,          // 10k requests/hour
  recruiter: 5000,       // 5k requests/hour
  hiring_manager: 2000,  // 2k requests/hour
  member: 1000,          // 1k requests/hour
  default: 100,          // 100 requests/hour for unknown roles
  windowMs: 60 * 60 * 1000, // 1 hour window
});

// Apply to protected routes
router.use('/api/candidates', requireAuth, roleLimiter);
router.use('/api/jobs', requireAuth, roleLimiter);
```

### 3. Custom Endpoint-Specific Limiter

```javascript
import { createEndpointLimiter } from '../middleware/rateLimit.js';

// Create limiter for specific endpoint
const searchLimiter = createEndpointLimiter({
  endpoint: 'search',
  windowMs: 60 * 1000,  // 1 minute
  max: 30,              // 30 searches per minute
  message: 'Search rate limit exceeded',
});

router.get('/api/search', requireAuth, searchLimiter, searchController);
```

### 4. Custom Rate Limiter

```javascript
import rateLimitManager from '../middleware/rateLimit.js';

// Create completely custom rate limiter
const customLimiter = rateLimitManager.createLimiter({
  windowMs: 5 * 60 * 1000,  // 5 minutes
  max: 50,                  // 50 requests
  message: 'Custom rate limit exceeded',
  
  // Custom key generator (e.g., by organization)
  keyGenerator: (req) => {
    return `org:${req.user.organization_id}:${req.user.id}`;
  },
  
  // Skip successful requests
  skipSuccessfulRequests: false,
  
  // Skip failed requests
  skipFailedRequests: true,
  
  // Custom handler
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: 300,  // 5 minutes
    });
  },
  
  // Callback when limit is reached
  onLimitReached: (req) => {
    console.log('Rate limit exceeded:', req.user?.email);
    // Send alert, log to monitoring, etc.
  },
});

router.post('/api/expensive-operation', requireAuth, customLimiter, controller);
```

### 5. Bypass Rate Limiting for Specific Conditions

```javascript
import { bypassRateLimitIf } from '../middleware/rateLimit.js';

// Bypass rate limiting for admin users
const bypassForAdmin = bypassRateLimitIf((req) => {
  return req.user?.role === 'admin';
});

// Bypass for internal API calls
const bypassForInternal = bypassRateLimitIf((req) => {
  return req.get('X-Internal-API-Key') === process.env.INTERNAL_API_KEY;
});

router.get('/api/analytics', 
  requireAuth, 
  bypassForAdmin, 
  roleLimiter, 
  analyticsController
);
```

## Response Headers

The rate limiting system adds standard RateLimit headers to all responses:

### Header Format

```http
RateLimit-Limit: 100              # Maximum requests allowed
RateLimit-Remaining: 95           # Requests remaining in current window
RateLimit-Reset: 1698508800       # Unix timestamp when limit resets
```

### Example Response (Success)

```http
HTTP/1.1 200 OK
Content-Type: application/json
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1698508800

{
  "success": true,
  "data": { ... },
  "rateLimit": {
    "limit": 100,
    "remaining": 95,
    "reset": "1698508800"
  }
}
```

### Example Response (Limit Exceeded)

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1698508800
Retry-After: 900

{
  "error": "Rate Limit Exceeded",
  "message": "Too many requests, please try again later",
  "retryAfter": 900,
  "limit": 100,
  "windowMs": 900000
}
```

## Client-Side Handling

### JavaScript/TypeScript Example

```typescript
async function makeApiRequest(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, options);
    
    // Check rate limit headers
    const limit = parseInt(response.headers.get('RateLimit-Limit') || '0');
    const remaining = parseInt(response.headers.get('RateLimit-Remaining') || '0');
    const reset = parseInt(response.headers.get('RateLimit-Reset') || '0');
    
    // Warn user when approaching limit
    if (remaining < limit * 0.1) {  // Less than 10% remaining
      console.warn(`API rate limit warning: ${remaining}/${limit} requests remaining`);
      showUserWarning('You are approaching your API rate limit');
    }
    
    // Handle rate limit exceeded
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      const data = await response.json();
      
      throw new RateLimitError(
        data.message,
        retryAfter,
        limit,
        remaining,
        reset
      );
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof RateLimitError) {
      // Show user-friendly message
      showRateLimitMessage(error.retryAfter);
      
      // Optionally retry after delay
      await delay(error.retryAfter * 1000);
      return makeApiRequest(url, options);
    }
    throw error;
  }
}
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export function useRateLimit() {
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  
  const updateRateLimit = (headers: Headers) => {
    const limit = parseInt(headers.get('RateLimit-Limit') || '0');
    const remaining = parseInt(headers.get('RateLimit-Remaining') || '0');
    const reset = parseInt(headers.get('RateLimit-Reset') || '0');
    
    if (limit > 0) {
      setRateLimit({ limit, remaining, reset });
    }
  };
  
  const isNearLimit = rateLimit && rateLimit.remaining < rateLimit.limit * 0.2;
  
  return { rateLimit, updateRateLimit, isNearLimit };
}
```

## Monitoring & Logging

### Rate Limit Events

The system logs the following events:

1. **Rate limit exceeded**: When a client hits the limit
2. **Redis connection**: Connection status changes
3. **Store fallback**: When falling back to memory store
4. **Suspicious activity**: Unusual patterns (e.g., many auth failures)

### Log Examples

```javascript
// Rate limit exceeded
{
  level: 'warn',
  message: 'Rate limit exceeded',
  ip: '192.168.1.100',
  userId: 'user-123',
  path: '/api/candidates',
  method: 'GET',
  limit: 100,
  windowMs: 900000,
  timestamp: '2025-10-28T10:30:00.000Z'
}

// Potential brute force attack
{
  level: 'warn',
  message: 'Auth rate limit exceeded - potential brute force attack',
  ip: '203.0.113.42',
  path: '/api/auth/login',
  userAgent: 'Mozilla/5.0...',
  timestamp: '2025-10-28T10:30:00.000Z'
}
```

### Metrics to Track

1. **Rate Limit Hit Rate**: Percentage of requests that hit the limit
2. **Top Rate Limited IPs**: IPs hitting limits most frequently
3. **Rate Limit by Endpoint**: Which endpoints are rate limited most
4. **Rate Limit by Role**: Usage patterns per role
5. **Redis Performance**: Connection health, latency

### Example Monitoring Query (for logging systems)

```
# Find IPs hitting rate limits
fields @timestamp, ip, path
| filter message = "Rate limit exceeded"
| stats count() by ip
| sort count desc
| limit 10

# Find most rate-limited endpoints
fields @timestamp, path
| filter message = "Rate limit exceeded"
| stats count() by path
| sort count desc
```

## Best Practices

### 1. Choose Appropriate Limits

```javascript
// ✅ Good: Different limits for different operations
const readLimiter = createEndpointLimiter({ max: 1000, windowMs: 3600000 }); // Read-heavy
const writeLimiter = createEndpointLimiter({ max: 100, windowMs: 3600000 });  // Write operations
const searchLimiter = createEndpointLimiter({ max: 50, windowMs: 60000 });    // Expensive searches

// ❌ Bad: Same limit for everything
const oneLimiter = rateLimit({ max: 100 });
app.use(oneLimiter);  // Too restrictive for reads, too lenient for writes
```

### 2. Use skipSuccessfulRequests for Auth

```javascript
// ✅ Good: Don't penalize successful logins
const authLimiter = rateLimitManager.createLimiter({
  max: 5,
  skipSuccessfulRequests: true,  // Only count failed attempts
});

// ❌ Bad: Counting all attempts
const authLimiter = rateLimit({ max: 5 });  // Blocks users after 5 logins
```

### 3. Provide Clear Error Messages

```javascript
// ✅ Good: Helpful error message
message: 'Too many login attempts. Please wait 15 minutes and try again.',

// ❌ Bad: Generic error
message: 'Error',
```

### 4. Set Appropriate Retry-After Headers

```javascript
// ✅ Good: Calculate based on window
const retryAfter = Math.ceil(windowMs / 1000);
res.setHeader('Retry-After', retryAfter);

// ❌ Bad: Hardcoded value
res.setHeader('Retry-After', '60');
```

### 5. Monitor and Adjust

```javascript
// Start conservative, then adjust based on usage patterns
const initialLimiter = rateLimit({ max: 100 });

// After monitoring:
// - Admin users need 10x more
// - Regular users are fine
// - Public endpoints need stricter limits

const adjustedLimiter = createRoleBasedLimiter({
  admin: 1000,
  user: 100,
  public: 50,
});
```

## Troubleshooting

### Issue: Rate limits not working across multiple servers

**Cause**: Using memory store instead of Redis  
**Solution**: Enable Redis in production

```bash
REDIS_ENABLED=true
REDIS_URL=redis://your-redis-server:6379
```

### Issue: Users hitting limits too quickly

**Cause**: Limit is too low or client is making too many requests  
**Solution**: 
1. Check client code for unnecessary requests
2. Implement client-side caching
3. Increase limits if legitimate usage

### Issue: Redis connection failures

**Cause**: Redis server unavailable or credentials incorrect  
**Solution**: System automatically falls back to memory store, but fix Redis:

```bash
# Check Redis connectivity
redis-cli -h your-redis-server -p 6379 ping

# Check authentication
redis-cli -h your-redis-server -a your-password ping

# Check logs
docker logs redis-ratelimit
```

### Issue: Rate limit headers not appearing

**Cause**: `addRateLimitHeaders` middleware not applied  
**Solution**: Add middleware before routes

```javascript
app.use(addRateLimitHeaders);  // Must be before routes
app.use('/api', routes);
```

## Security Considerations

### 1. DDoS Protection

Rate limiting provides **first line of defense** against DDoS:

```javascript
// Very strict limits for public endpoints
const ddosProtection = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 10,                  // 10 requests per minute
  skipSuccessfulRequests: false,
});

app.use('/api/public/', ddosProtection);
```

### 2. Brute Force Protection

```javascript
// Auth endpoints with progressive delays
const bruteForceProtection = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  onLimitReached: (req) => {
    // Alert security team
    sendSecurityAlert({
      type: 'BRUTE_FORCE_ATTEMPT',
      ip: req.ip,
      timestamp: new Date(),
    });
  },
});
```

### 3. Resource Exhaustion

```javascript
// Protect expensive operations
const heavyOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,
  message: 'This operation is rate limited to prevent system overload',
});
```

## Performance Impact

### Memory Store
- **Latency**: < 1ms
- **Scalability**: Single server only
- **Memory**: ~1KB per active key

### Redis Store
- **Latency**: 1-5ms (local), 10-50ms (remote)
- **Scalability**: Distributed, all servers share limits
- **Memory**: Stored in Redis, not application memory

### Recommendations

- **Development**: Memory store (no setup required)
- **Production (single server)**: Memory store (faster)
- **Production (multiple servers)**: Redis store (required for consistency)
- **Production (high traffic)**: Redis Cluster for scalability

---

**Last Updated**: October 28, 2025  
**Version**: 2.0.0  
**Status**: ✅ Production Ready
