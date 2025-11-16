# Compression Implementation Plan

**Priority:** High  
**Effort:** 1 hour  
**Impact:** Immediate bandwidth reduction (60-80% for JSON), faster response times  
**Phase:** 1 (Quick Win)

---

## Overview

Implement HTTP compression (gzip/brotli) for all API responses to reduce bandwidth usage and improve response times, especially for mobile clients and large payloads.

### Business Value

- **Bandwidth Savings:** 60-80% reduction in data transfer for JSON responses
- **Performance Improvement:** 2-3x faster response times on slow networks
- **Cost Reduction:** Lower AWS data transfer costs (~$500-1000/month for high-traffic APIs)
- **Mobile Experience:** Significantly improved performance on cellular networks

---

## Current State

**Status:** Not implemented  
**Gap:** API responses are sent uncompressed, wasting bandwidth and slowing down responses

**Evidence from codebase:**
```javascript
// backend/src/server.js - No compression middleware found
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
// Missing: compression middleware
```

---

## Technical Implementation

### 1. Install Dependencies

```bash
cd backend
npm install compression
```

### 2. Create Compression Middleware

**File:** `backend/src/middleware/compression.js`

```javascript
import compression from 'compression';
import logger from '../utils/logger.js';

/**
 * Compression middleware configuration
 * Implements gzip/brotli compression for API responses
 */

/**
 * Determines if response should be compressed
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @returns {boolean}
 */
function shouldCompress(req, res) {
  // Don't compress if client doesn't accept encoding
  if (req.headers['x-no-compression']) {
    return false;
  }

  // Don't compress tiny responses (overhead not worth it)
  const contentLength = res.getHeader('Content-Length');
  if (contentLength && parseInt(contentLength) < 1024) {
    return false;
  }

  // Don't compress already compressed files
  const contentType = res.getHeader('Content-Type');
  if (contentType) {
    const noCompressTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/',
      'audio/',
      'application/zip',
      'application/gzip',
      'application/pdf'
    ];

    if (noCompressTypes.some(type => contentType.includes(type))) {
      return false;
    }
  }

  // Use compression's default filter for everything else
  return compression.filter(req, res);
}

/**
 * Compression middleware with monitoring
 */
export const compressionMiddleware = compression({
  filter: shouldCompress,
  level: 6, // Balanced compression level (1-9, higher = more compression but slower)
  threshold: 1024, // Only compress responses > 1KB
  memLevel: 8, // Memory usage (1-9, higher = more memory but better compression)
});

/**
 * Middleware to log compression stats
 */
export function compressionLogger(req, res, next) {
  const originalWrite = res.write;
  const originalEnd = res.end;
  let originalSize = 0;
  let compressedSize = 0;

  // Track original size
  res.write = function(chunk, ...args) {
    if (chunk) {
      originalSize += Buffer.byteLength(chunk);
    }
    return originalWrite.apply(res, [chunk, ...args]);
  };

  res.end = function(chunk, ...args) {
    if (chunk) {
      originalSize += Buffer.byteLength(chunk);
    }

    // Track compressed size
    const contentLength = res.getHeader('Content-Length');
    if (contentLength) {
      compressedSize = parseInt(contentLength);
    }

    // Log compression stats
    if (originalSize > 0 && compressedSize > 0) {
      const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
      const encoding = res.getHeader('Content-Encoding');

      logger.debug('Response compressed', {
        path: req.path,
        originalSize,
        compressedSize,
        savings: `${ratio}%`,
        encoding,
        contentType: res.getHeader('Content-Type')
      });
    }

    return originalEnd.apply(res, [chunk, ...args]);
  };

  next();
}

export default compressionMiddleware;
```

### 3. Update Server Configuration

**File:** `backend/src/server.js`

```javascript
// Add after express.json() and before routes
import compressionMiddleware, { compressionLogger } from './middleware/compression.js';

// ... existing middleware ...
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Add compression (should be early in middleware chain)
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_COMPRESSION === 'true') {
  app.use(compressionMiddleware);
  
  // Optional: Add compression logging in development
  if (process.env.LOG_COMPRESSION === 'true') {
    app.use(compressionLogger);
  }
  
  logger.info('HTTP compression enabled');
}

// ... continue with other middleware and routes ...
```

### 4. Environment Configuration

**File:** `backend/.env` (add these variables)

```bash
# Compression settings
ENABLE_COMPRESSION=true
LOG_COMPRESSION=false  # Set to true to debug compression
```

---

## Testing Strategy

### 1. Unit Tests

**File:** `backend/tests/middleware/compression.test.js`

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import compressionMiddleware from '../../src/middleware/compression.js';

describe('Compression Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(compressionMiddleware);
  });

  it('should compress large JSON responses', async () => {
    app.get('/large-json', (req, res) => {
      const largeData = Array(1000).fill({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test User',
        email: 'test@example.com',
        description: 'A'.repeat(100)
      });
      res.json({ success: true, data: largeData });
    });

    const response = await request(app)
      .get('/large-json')
      .set('Accept-Encoding', 'gzip')
      .expect(200);

    expect(response.headers['content-encoding']).toBe('gzip');
    expect(response.body.success).toBe(true);
  });

  it('should not compress small responses', async () => {
    app.get('/small-json', (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .get('/small-json')
      .set('Accept-Encoding', 'gzip')
      .expect(200);

    expect(response.headers['content-encoding']).toBeUndefined();
  });

  it('should not compress if client does not accept encoding', async () => {
    app.get('/test', (req, res) => {
      const largeData = { data: 'A'.repeat(2000) };
      res.json(largeData);
    });

    const response = await request(app)
      .get('/test')
      .expect(200);

    expect(response.headers['content-encoding']).toBeUndefined();
  });

  it('should not compress already compressed files', async () => {
    app.get('/image', (req, res) => {
      res.setHeader('Content-Type', 'image/jpeg');
      res.send(Buffer.alloc(5000));
    });

    const response = await request(app)
      .get('/image')
      .set('Accept-Encoding', 'gzip')
      .expect(200);

    expect(response.headers['content-encoding']).toBeUndefined();
  });

  it('should honor x-no-compression header', async () => {
    app.get('/test', (req, res) => {
      res.json({ data: 'A'.repeat(2000) });
    });

    const response = await request(app)
      .get('/test')
      .set('Accept-Encoding', 'gzip')
      .set('x-no-compression', '1')
      .expect(200);

    expect(response.headers['content-encoding']).toBeUndefined();
  });
});
```

### 2. Integration Tests

```javascript
// Test actual compression ratio
describe('Compression Integration', () => {
  it('should achieve 60%+ compression for typical API responses', async () => {
    const response = await request(app)
      .get('/api/v1/jobs')
      .set('Accept-Encoding', 'gzip')
      .expect(200);

    const compressedSize = Buffer.byteLength(response.body);
    const uncompressedResponse = await request(app)
      .get('/api/v1/jobs')
      .expect(200);
    const uncompressedSize = Buffer.byteLength(JSON.stringify(uncompressedResponse.body));

    const compressionRatio = (uncompressedSize - compressedSize) / uncompressedSize;
    expect(compressionRatio).toBeGreaterThan(0.6); // 60% compression
  });
});
```

### 3. Manual Testing

```bash
# Test compression with curl
curl -H "Accept-Encoding: gzip" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -i http://localhost:3001/api/v1/jobs | head -20

# Should show: Content-Encoding: gzip

# Compare sizes
curl -H "Accept-Encoding: gzip" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/v1/jobs -o compressed.gz

curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/v1/jobs -o uncompressed.json

ls -lh compressed.gz uncompressed.json
```

---

## Rollout Plan

### Stage 1: Development (Day 1)
- [x] Install compression package
- [x] Create compression middleware
- [x] Add to server.js with feature flag
- [x] Write unit tests
- [x] Manual testing in local environment

### Stage 2: Staging (Day 1)
- [ ] Deploy to staging with `ENABLE_COMPRESSION=true`
- [ ] Enable `LOG_COMPRESSION=true` for monitoring
- [ ] Run integration tests
- [ ] Monitor compression ratios in logs
- [ ] Performance testing with large payloads

### Stage 3: Production (Day 2)
- [ ] Deploy to production during low-traffic window
- [ ] Monitor CloudWatch/DataDog metrics:
  - Response times (should decrease)
  - Network bytes out (should decrease 60-80%)
  - CPU usage (may increase slightly ~5%)
- [ ] Monitor error rates (should be unchanged)
- [ ] A/B test with 10% traffic initially

### Stage 4: Full Rollout (Day 3)
- [ ] Enable for 100% of traffic
- [ ] Update API documentation
- [ ] Announce in changelog

---

## Monitoring & Metrics

### Key Metrics to Track

```javascript
// Add to monitoring dashboard
{
  "compression_ratio": "avg((original_size - compressed_size) / original_size)",
  "bandwidth_savings_mb": "sum(original_size - compressed_size) / 1024 / 1024",
  "compression_cpu_overhead": "avg(cpu_usage_after - cpu_usage_before)",
  "compressed_requests_total": "count(responses where Content-Encoding exists)"
}
```

### CloudWatch Alarms

```yaml
Alarms:
  - Name: HighCompressionCPU
    Metric: CPUUtilization
    Threshold: 80%
    Action: Alert if compression causes CPU spike

  - Name: CompressionErrors
    Metric: ErrorCount
    Filter: "compression error"
    Threshold: 10 per minute
    Action: Alert and disable compression
```

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Increased CPU usage | Medium | High | Start with compression level 6 (balanced), can reduce to 4-5 if needed |
| Compression errors | High | Low | Comprehensive error handling in middleware, fallback to uncompressed |
| Client compatibility | Low | Very Low | All modern clients support gzip, can disable per-client if needed |
| Already compressed data | Low | Low | Filter prevents re-compression of images, videos, PDFs |

---

## Success Criteria

- ✅ 60-80% bandwidth reduction for JSON responses
- ✅ Response time improvement of 20-30% on slow networks
- ✅ Zero increase in error rates
- ✅ CPU usage increase < 10%
- ✅ All tests passing
- ✅ No client complaints or compatibility issues

---

## Documentation Updates

### API Documentation

Add to `docs/API_STANDARDS.md`:

```markdown
## Compression

All API responses are compressed using gzip or brotli encoding when the client supports it.

**Request Headers:**
```http
Accept-Encoding: gzip, deflate, br
```

**Response Headers:**
```http
Content-Encoding: gzip
Vary: Accept-Encoding
```

**Disabling Compression:**
```http
X-No-Compression: 1
```

**Minimum Size:** Responses smaller than 1KB are not compressed due to overhead.

**Excluded Types:** Images (JPEG, PNG, GIF, WebP), videos, audio, PDFs, and already compressed formats are not re-compressed.
```

---

## Future Enhancements

1. **Brotli Support:** Add brotli compression for even better ratios (75-85% compression)
2. **Dynamic Level:** Adjust compression level based on CPU usage
3. **Caching:** Cache compressed responses for frequently accessed endpoints
4. **Metrics Dashboard:** Real-time compression analytics

---

## References

- [compression npm package](https://www.npmjs.com/package/compression)
- [MDN: HTTP Compression](https://developer.mozilla.org/en-US/docs/Web/HTTP/Compression)
- [Google Web Fundamentals: Text Compression](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/optimize-encoding-and-transfer)
