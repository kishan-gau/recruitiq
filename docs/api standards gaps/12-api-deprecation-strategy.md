# API Deprecation Strategy Implementation Plan

**Priority:** Low  
**Effort:** 1 day  
**Impact:** Smooth API evolution, better client communication, reduced breaking changes  
**Phase:** 3 (Advanced)

---

## Overview

Implement a comprehensive API deprecation strategy using `Sunset` headers, deprecation warnings, and versioned endpoints to manage API lifecycle and minimize disruption during breaking changes.

### Business Value

- **Smooth Transitions:** Clients get advance notice of changes
- **Reduced Support Burden:** Clear migration paths reduce support tickets
- **Trust Building:** Transparent deprecation process builds client confidence
- **Technical Debt Management:** Enables removal of legacy code safely
- **Compliance:** Meets enterprise API governance requirements

---

## Current State

**Status:** No deprecation process  
**Gap:** Breaking changes require immediate client updates or break applications

**Current Problem:**
```javascript
// No warning when endpoint will be removed
GET /api/v1/old-endpoint

{
  "success": true,
  "data": {...}
}

// Suddenly removed in next release
GET /api/v1/old-endpoint
→ 404 Not Found

// Clients break without warning
```

**Desired with Deprecation Strategy:**
```javascript
// 6 months before removal
GET /api/v1/old-endpoint
Sunset: Sat, 16 May 2026 00:00:00 GMT
Deprecation: Sun, 16 Nov 2025 00:00:00 GMT
Link: </api/v1/new-endpoint>; rel="successor-version"
Warning: 299 - "This endpoint is deprecated. Use /api/v1/new-endpoint instead."

{
  "success": true,
  "data": {...},
  "_deprecation": {
    "deprecated": true,
    "sunsetDate": "2026-05-16T00:00:00Z",
    "replacement": "/api/v1/new-endpoint",
    "migrationGuide": "https://docs.recruitiq.com/migration/old-to-new"
  }
}

// Clients have 6 months to migrate
// After sunset date:
GET /api/v1/old-endpoint
→ 410 Gone
```

---

## Technical Implementation

### 1. Database Schema

**File:** `backend/migrations/20251116_create_deprecations_table.sql`

```sql
-- API endpoint deprecations
CREATE TABLE api_deprecations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Endpoint details
  endpoint_path VARCHAR(500) NOT NULL,
  http_method VARCHAR(10) NOT NULL,
  api_version VARCHAR(20) NOT NULL DEFAULT 'v1',
  
  -- Deprecation timeline
  deprecated_at TIMESTAMP NOT NULL,
  sunset_date TIMESTAMP NOT NULL,
  removed_at TIMESTAMP,
  
  -- Replacement information
  replacement_endpoint VARCHAR(500),
  migration_guide_url TEXT,
  reason TEXT NOT NULL,
  breaking_changes TEXT[],
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'deprecated',  -- deprecated, sunset, removed
  
  -- Notifications
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  notification_sent_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  
  -- Constraints
  CONSTRAINT check_sunset_after_deprecated CHECK (sunset_date > deprecated_at),
  CONSTRAINT check_status CHECK (status IN ('deprecated', 'sunset', 'removed'))
);

CREATE INDEX idx_api_deprecations_endpoint ON api_deprecations(endpoint_path, http_method);
CREATE INDEX idx_api_deprecations_status ON api_deprecations(status);
CREATE INDEX idx_api_deprecations_sunset ON api_deprecations(sunset_date);

-- Deprecation usage tracking
CREATE TABLE api_deprecation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deprecation_id UUID NOT NULL REFERENCES api_deprecations(id),
  
  -- Client information
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  client_id VARCHAR(255),
  user_agent TEXT,
  
  -- Usage stats
  request_count INTEGER NOT NULL DEFAULT 1,
  first_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (deprecation_id, organization_id, client_id)
);

CREATE INDEX idx_deprecation_usage_deprecation_id ON api_deprecation_usage(deprecation_id);
CREATE INDEX idx_deprecation_usage_org_id ON api_deprecation_usage(organization_id);

COMMENT ON TABLE api_deprecations IS 'Tracks deprecated API endpoints';
COMMENT ON TABLE api_deprecation_usage IS 'Tracks usage of deprecated endpoints';
```

### 2. Deprecation Service

**File:** `backend/src/services/DeprecationService.js`

```javascript
import { query } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * API Deprecation Service
 */
class DeprecationService {
  /**
   * Register deprecated endpoint
   */
  async deprecateEndpoint(data, userId) {
    const {
      endpointPath,
      httpMethod,
      apiVersion = 'v1',
      sunsetDate,
      replacementEndpoint,
      migrationGuideUrl,
      reason,
      breakingChanges
    } = data;

    const text = `
      INSERT INTO api_deprecations (
        endpoint_path, http_method, api_version,
        deprecated_at, sunset_date,
        replacement_endpoint, migration_guide_url,
        reason, breaking_changes,
        created_by
      )
      VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await query(text, [
      endpointPath,
      httpMethod,
      apiVersion,
      sunsetDate,
      replacementEndpoint,
      migrationGuideUrl,
      reason,
      breakingChanges,
      userId
    ]);

    logger.info('Endpoint deprecated', {
      endpoint: `${httpMethod} ${endpointPath}`,
      sunsetDate
    });

    return result.rows[0];
  }

  /**
   * Get deprecation info for endpoint
   */
  async getDeprecation(path, method) {
    const text = `
      SELECT *
      FROM api_deprecations
      WHERE endpoint_path = $1
        AND http_method = $2
        AND status != 'removed'
      ORDER BY deprecated_at DESC
      LIMIT 1
    `;

    const result = await query(text, [path, method]);
    return result.rows[0] || null;
  }

  /**
   * Check if endpoint is deprecated
   */
  async isDeprecated(path, method) {
    const deprecation = await this.getDeprecation(path, method);
    return !!deprecation;
  }

  /**
   * Track deprecated endpoint usage
   */
  async trackUsage(deprecation, req) {
    const {
      organizationId,
      id: userId
    } = req.user || {};

    const clientId = req.get('X-Client-ID') || 'unknown';
    const userAgent = req.get('User-Agent');

    const text = `
      INSERT INTO api_deprecation_usage (
        deprecation_id, organization_id, user_id,
        client_id, user_agent
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (deprecation_id, organization_id, client_id)
      DO UPDATE SET
        request_count = api_deprecation_usage.request_count + 1,
        last_seen = NOW()
    `;

    await query(text, [
      deprecation.id,
      organizationId,
      userId,
      clientId,
      userAgent
    ]);
  }

  /**
   * Get deprecation statistics
   */
  async getUsageStats(deprecationId) {
    const text = `
      SELECT
        COUNT(DISTINCT organization_id) as affected_organizations,
        SUM(request_count) as total_requests,
        MAX(last_seen) as last_usage
      FROM api_deprecation_usage
      WHERE deprecation_id = $1
    `;

    const result = await query(text, [deprecationId]);
    return result.rows[0];
  }

  /**
   * List all deprecations
   */
  async listDeprecations(status = null) {
    let text = `
      SELECT d.*,
        COUNT(DISTINCT du.organization_id) as affected_orgs,
        SUM(du.request_count) as total_requests
      FROM api_deprecations d
      LEFT JOIN api_deprecation_usage du ON d.id = du.deprecation_id
    `;

    const params = [];
    if (status) {
      text += ' WHERE d.status = $1';
      params.push(status);
    }

    text += ' GROUP BY d.id ORDER BY d.sunset_date ASC';

    const result = await query(text, params);
    return result.rows;
  }

  /**
   * Update deprecation status based on sunset date
   */
  async updateDeprecationStatuses() {
    // Mark as sunset if past sunset date
    await query(`
      UPDATE api_deprecations
      SET status = 'sunset'
      WHERE status = 'deprecated'
        AND sunset_date <= NOW()
    `);

    // Log sunset endpoints
    const sunsetEndpoints = await query(`
      SELECT *
      FROM api_deprecations
      WHERE status = 'sunset'
        AND removed_at IS NULL
    `);

    sunsetEndpoints.rows.forEach(endpoint => {
      logger.warn('Endpoint has reached sunset date', {
        endpoint: `${endpoint.http_method} ${endpoint.endpoint_path}`,
        sunsetDate: endpoint.sunset_date
      });
    });
  }
}

export default new DeprecationService();
```

### 3. Deprecation Middleware

**File:** `backend/src/middleware/deprecation.js`

```javascript
import DeprecationService from '../services/DeprecationService.js';
import logger from '../utils/logger.js';

/**
 * Deprecation warning middleware
 */
export function deprecationWarning() {
  return async (req, res, next) => {
    try {
      const path = req.path;
      const method = req.method;

      // Check if endpoint is deprecated
      const deprecation = await DeprecationService.getDeprecation(path, method);

      if (!deprecation) {
        return next();
      }

      // Track usage
      await DeprecationService.trackUsage(deprecation, req);

      // Add deprecation headers
      res.set('Deprecation', deprecation.deprecated_at.toUTCString());
      res.set('Sunset', deprecation.sunset_date.toUTCString());

      if (deprecation.replacement_endpoint) {
        res.set('Link', `<${deprecation.replacement_endpoint}>; rel="successor-version"`);
      }

      // Add warning header
      const daysUntilSunset = Math.ceil(
        (new Date(deprecation.sunset_date) - new Date()) / (1000 * 60 * 60 * 24)
      );

      res.set(
        'Warning',
        `299 - "This endpoint is deprecated and will be removed in ${daysUntilSunset} days. ` +
        `Use ${deprecation.replacement_endpoint || 'alternative endpoint'} instead."`
      );

      // Store deprecation info for response body
      req.deprecationInfo = {
        deprecated: true,
        deprecatedAt: deprecation.deprecated_at,
        sunsetDate: deprecation.sunset_date,
        replacement: deprecation.replacement_endpoint,
        migrationGuide: deprecation.migration_guide_url,
        reason: deprecation.reason,
        daysUntilSunset
      };

      // Log usage
      logger.warn('Deprecated endpoint accessed', {
        endpoint: `${method} ${path}`,
        organizationId: req.user?.organizationId,
        userId: req.user?.id,
        daysUntilSunset
      });

      next();
    } catch (error) {
      // Don't break on deprecation check failure
      logger.error('Deprecation middleware error', {
        error: error.message
      });
      next();
    }
  };
}

/**
 * Sunset enforcement middleware
 * Returns 410 Gone for sunset endpoints
 */
export function sunsetEnforcement() {
  return async (req, res, next) => {
    try {
      const deprecation = await DeprecationService.getDeprecation(
        req.path,
        req.method
      );

      if (!deprecation) {
        return next();
      }

      // Check if past sunset date
      if (new Date() > new Date(deprecation.sunset_date)) {
        return res.status(410).json({
          success: false,
          error: 'This endpoint has been removed',
          errorCode: 'ENDPOINT_SUNSET',
          sunsetDate: deprecation.sunset_date,
          replacement: deprecation.replacement_endpoint,
          migrationGuide: deprecation.migration_guide_url
        });
      }

      next();
    } catch (error) {
      logger.error('Sunset enforcement error', {
        error: error.message
      });
      next();
    }
  };
}

/**
 * Add deprecation info to response body
 */
export function deprecationInResponse() {
  return (req, res, next) => {
    if (!req.deprecationInfo) {
      return next();
    }

    // Store original json method
    const originalJson = res.json;

    // Override json method
    res.json = function(body) {
      if (body && typeof body === 'object') {
        body._deprecation = req.deprecationInfo;
      }
      return originalJson.call(this, body);
    };

    next();
  };
}

export default {
  deprecationWarning,
  sunsetEnforcement,
  deprecationInResponse
};
```

### 4. Apply Middleware

**File:** `backend/src/server.js`

```javascript
import { 
  sunsetEnforcement, 
  deprecationWarning, 
  deprecationInResponse 
} from './middleware/deprecation.js';

// Apply globally
app.use(sunsetEnforcement());      // Return 410 for sunset endpoints
app.use(deprecationWarning());     // Add deprecation headers
app.use(deprecationInResponse());  // Add deprecation to response body

// Routes
app.use('/api/v1', routes);
```

### 5. Deprecation Management Routes

**File:** `backend/src/routes/admin/deprecations.js`

```javascript
import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import DeprecationService from '../../services/DeprecationService.js';

const router = express.Router();

/**
 * List all deprecations
 */
router.get('/',
  authenticate,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { status } = req.query;
      
      const deprecations = await DeprecationService.listDeprecations(status);
      
      return res.status(200).json({
        success: true,
        deprecations
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Register new deprecation
 */
router.post('/',
  authenticate,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { id: userId } = req.user;
      
      const deprecation = await DeprecationService.deprecateEndpoint(
        req.body,
        userId
      );
      
      return res.status(201).json({
        success: true,
        deprecation
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get deprecation usage statistics
 */
router.get('/:id/stats',
  authenticate,
  requireRole('admin'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const stats = await DeprecationService.getUsageStats(id);
      
      return res.status(200).json({
        success: true,
        stats
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

### 6. Client SDK Support

**File:** `packages/api-client/src/client.js`

```javascript
class APIClient {
  constructor() {
    this.deprecationWarnings = [];
    
    // Intercept responses to check for deprecation
    this.axios.interceptors.response.use(
      (response) => {
        this.checkDeprecation(response);
        return response;
      },
      (error) => {
        if (error.response) {
          this.checkDeprecation(error.response);
        }
        throw error;
      }
    );
  }

  /**
   * Check for deprecation headers
   */
  checkDeprecation(response) {
    const deprecation = response.headers['deprecation'];
    const sunset = response.headers['sunset'];
    
    if (deprecation || sunset) {
      const warning = {
        endpoint: `${response.config.method.toUpperCase()} ${response.config.url}`,
        deprecatedAt: deprecation,
        sunsetDate: sunset,
        replacement: this.parseLink(response.headers['link']),
        warning: response.headers['warning']
      };
      
      this.deprecationWarnings.push(warning);
      
      // Emit event for logging
      this.emit('deprecation', warning);
      
      // Console warning in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Deprecated API endpoint used:', warning);
      }
    }
  }

  /**
   * Parse Link header
   */
  parseLink(linkHeader) {
    if (!linkHeader) return null;
    
    const match = linkHeader.match(/<([^>]+)>/);
    return match ? match[1] : null;
  }

  /**
   * Get all deprecation warnings
   */
  getDeprecationWarnings() {
    return this.deprecationWarnings;
  }
}
```

---

## Testing Strategy (Abbreviated)

### Integration Tests

```javascript
describe('Deprecation Middleware', () => {
  it('should add deprecation headers', async () => {
    // Deprecate endpoint
    await DeprecationService.deprecateEndpoint({
      endpointPath: '/api/v1/old-endpoint',
      httpMethod: 'GET',
      sunsetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      replacementEndpoint: '/api/v1/new-endpoint',
      reason: 'Endpoint redesigned'
    });

    const response = await request(app)
      .get('/api/v1/old-endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.headers).toHaveProperty('deprecation');
    expect(response.headers).toHaveProperty('sunset');
    expect(response.body._deprecation).toBeDefined();
  });

  it('should return 410 Gone after sunset', async () => {
    // Deprecate with past sunset date
    await DeprecationService.deprecateEndpoint({
      endpointPath: '/api/v1/sunset-endpoint',
      httpMethod: 'GET',
      sunsetDate: new Date(Date.now() - 1000),
      reason: 'Removed'
    });

    await request(app)
      .get('/api/v1/sunset-endpoint')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(410);
  });
});
```

---

## Rollout Plan

### Day 1: Implementation & Testing
- [x] Create database schema
- [x] Implement DeprecationService
- [x] Create deprecation middleware
- [x] Write tests
- [ ] Apply to test endpoints
- [ ] Deploy to staging

### Post-Launch: Ongoing
- [ ] Register deprecated endpoints
- [ ] Monitor usage statistics
- [ ] Send migration notifications
- [ ] Remove sunset endpoints

---

## Success Criteria

- ✅ All deprecated endpoints include proper headers
- ✅ Usage tracking works correctly
- ✅ 410 Gone returned after sunset date
- ✅ Client SDK detects deprecation warnings
- ✅ Migration guides available

---

## Documentation

Add to `docs/API_STANDARDS.md`:

````markdown
## API Deprecation

We follow a transparent deprecation process:

### Deprecation Headers

Deprecated endpoints include:
- `Deprecation`: Date endpoint was deprecated
- `Sunset`: Date endpoint will be removed
- `Link`: Replacement endpoint
- `Warning`: Human-readable message

```http
GET /api/v1/old-endpoint
Deprecation: Sun, 16 Nov 2025 00:00:00 GMT
Sunset: Sat, 16 May 2026 00:00:00 GMT
Link: </api/v1/new-endpoint>; rel="successor-version"
Warning: 299 - "Use /api/v1/new-endpoint instead"
```

### Timeline

1. **Announcement** (T-6 months): Endpoint marked deprecated
2. **Sunset** (T+0): Endpoint returns 410 Gone
3. **Removal** (T+1 month): Code removed

### Response Body

```json
{
  "success": true,
  "data": {...},
  "_deprecation": {
    "deprecated": true,
    "sunsetDate": "2026-05-16T00:00:00Z",
    "replacement": "/api/v1/new-endpoint",
    "migrationGuide": "https://docs.recruitiq.com/migration",
    "daysUntilSunset": 180
  }
}
```
````

---

## References

- [RFC 8594 - Sunset Header](https://tools.ietf.org/html/rfc8594)
- [Deprecation Header Draft](https://tools.ietf.org/html/draft-dalal-deprecation-header)
- [Stripe API Versioning](https://stripe.com/docs/api/versioning)
