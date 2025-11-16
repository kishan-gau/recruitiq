# Webhooks System Implementation Plan

**Priority:** Low  
**Effort:** 7 days  
**Impact:** Event-driven integrations, real-time notifications, third-party integrations  
**Phase:** 3 (Advanced)

---

## Overview

Implement a comprehensive webhooks system to allow external systems to subscribe to events and receive real-time notifications when specific actions occur in RecruitIQ.

### Business Value

- **Third-Party Integrations:** Enable customers to integrate with external tools
- **Real-Time Updates:** Instant notifications instead of polling
- **Workflow Automation:** Trigger external workflows on events
- **Reduced API Load:** 90% fewer polling requests
- **Revenue Opportunity:** Premium feature for enterprise customers

---

## Current State

**Status:** Not implemented  
**Gap:** No event subscription or webhook delivery system

**Current Problem:**
```javascript
// Clients must poll for changes
setInterval(async () => {
  const jobs = await fetch('/api/v1/jobs?updatedSince=lastCheck');
  // Check for new/updated jobs
}, 60000);  // Poll every minute

// Issues:
// - Wastes API quota and bandwidth
// - Delayed notifications (up to 60s)
// - Unnecessary server load
// - Complex state tracking
```

**Desired with Webhooks:**
```javascript
// Subscribe to events once
POST /api/v1/webhooks
{
  "url": "https://customer.com/webhooks/recruitiq",
  "events": ["job.created", "job.published", "application.received"],
  "secret": "webhook_secret_123"
}

// RecruitIQ sends event when it happens:
POST https://customer.com/webhooks/recruitiq
X-Webhook-Signature: sha256=...
Content-Type: application/json

{
  "id": "evt_123abc",
  "type": "job.published",
  "timestamp": "2025-11-16T10:30:00Z",
  "data": {
    "job": {
      "id": "job-123",
      "title": "Senior Developer",
      "status": "open"
    }
  }
}
```

---

## Technical Implementation

### 1. Database Schema

**File:** `backend/migrations/20251116_create_webhooks_tables.sql`

```sql
-- Webhook subscriptions
CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Webhook configuration
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,  -- Array of event types
  secret VARCHAR(255) NOT NULL,  -- For signature verification
  description TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Retry configuration
  max_retries INTEGER NOT NULL DEFAULT 3,
  retry_delay_seconds INTEGER NOT NULL DEFAULT 60,
  
  -- Statistics
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  successful_deliveries INTEGER NOT NULL DEFAULT 0,
  failed_deliveries INTEGER NOT NULL DEFAULT 0,
  last_delivery_at TIMESTAMP,
  last_success_at TIMESTAMP,
  last_failure_at TIMESTAMP,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMP,
  
  -- Constraints
  CONSTRAINT check_url_format CHECK (url ~ '^https?://'),
  CONSTRAINT check_events_not_empty CHECK (array_length(events, 1) > 0)
);

CREATE INDEX idx_webhook_subscriptions_org_id ON webhook_subscriptions(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_webhook_subscriptions_is_active ON webhook_subscriptions(is_active) WHERE deleted_at IS NULL;

-- Webhook events log
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Event details
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  
  -- Delivery status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, delivered, failed
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMP,
  delivered_at TIMESTAMP,
  
  -- HTTP details
  request_body JSONB,
  request_headers JSONB,
  response_status INTEGER,
  response_body TEXT,
  response_headers JSONB,
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  next_retry_at TIMESTAMP
);

CREATE INDEX idx_webhook_events_subscription_id ON webhook_events(subscription_id);
CREATE INDEX idx_webhook_events_org_id ON webhook_events(organization_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status) WHERE status IN ('pending', 'failed');
CREATE INDEX idx_webhook_events_next_retry ON webhook_events(next_retry_at) WHERE status = 'failed' AND next_retry_at IS NOT NULL;
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- Event types catalog
CREATE TABLE webhook_event_types (
  event_type VARCHAR(100) PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  payload_schema JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Insert default event types
INSERT INTO webhook_event_types (event_type, category, description) VALUES
  -- Job events
  ('job.created', 'jobs', 'Job posting created'),
  ('job.updated', 'jobs', 'Job posting updated'),
  ('job.published', 'jobs', 'Job posting published'),
  ('job.closed', 'jobs', 'Job posting closed'),
  ('job.deleted', 'jobs', 'Job posting deleted'),
  
  -- Application events
  ('application.received', 'applications', 'New application received'),
  ('application.reviewed', 'applications', 'Application reviewed'),
  ('application.advanced', 'applications', 'Application advanced to next stage'),
  ('application.rejected', 'applications', 'Application rejected'),
  
  -- Interview events
  ('interview.scheduled', 'interviews', 'Interview scheduled'),
  ('interview.rescheduled', 'interviews', 'Interview rescheduled'),
  ('interview.completed', 'interviews', 'Interview completed'),
  ('interview.cancelled', 'interviews', 'Interview cancelled'),
  
  -- Candidate events
  ('candidate.created', 'candidates', 'Candidate added'),
  ('candidate.updated', 'candidates', 'Candidate updated'),
  
  -- Offer events
  ('offer.sent', 'offers', 'Offer sent to candidate'),
  ('offer.accepted', 'offers', 'Offer accepted'),
  ('offer.declined', 'offers', 'Offer declined');

COMMENT ON TABLE webhook_subscriptions IS 'Webhook subscriptions for event notifications';
COMMENT ON TABLE webhook_events IS 'Log of webhook event deliveries';
COMMENT ON TABLE webhook_event_types IS 'Catalog of available webhook event types';
```

### 2. Webhook Service

**File:** `backend/src/services/WebhookService.js`

```javascript
import crypto from 'crypto';
import axios from 'axios';
import { query } from '../config/database.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Webhook delivery service
 */
class WebhookService {
  /**
   * Create webhook subscription
   */
  async createSubscription(data, organizationId, userId) {
    const { url, events, description } = data;

    // Generate secret for signature verification
    const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;

    const text = `
      INSERT INTO webhook_subscriptions (
        organization_id, url, events, secret, description,
        created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await query(
      text,
      [organizationId, url, events, secret, description, userId, userId],
      organizationId,
      { operation: 'INSERT', table: 'webhook_subscriptions' }
    );

    logger.info('Webhook subscription created', {
      subscriptionId: result.rows[0].id,
      url,
      events,
      organizationId
    });

    return result.rows[0];
  }

  /**
   * List subscriptions
   */
  async listSubscriptions(organizationId) {
    const text = `
      SELECT *
      FROM webhook_subscriptions
      WHERE organization_id = $1
        AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;

    const result = await query(
      text,
      [organizationId],
      organizationId,
      { operation: 'SELECT', table: 'webhook_subscriptions' }
    );

    return result.rows;
  }

  /**
   * Update subscription
   */
  async updateSubscription(id, data, organizationId, userId) {
    const { url, events, isActive } = data;

    const text = `
      UPDATE webhook_subscriptions
      SET 
        url = COALESCE($1, url),
        events = COALESCE($2, events),
        is_active = COALESCE($3, is_active),
        updated_by = $4,
        updated_at = NOW()
      WHERE id = $5
        AND organization_id = $6
        AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await query(
      text,
      [url, events, isActive, userId, id, organizationId],
      organizationId,
      { operation: 'UPDATE', table: 'webhook_subscriptions' }
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Webhook subscription not found');
    }

    return result.rows[0];
  }

  /**
   * Delete subscription
   */
  async deleteSubscription(id, organizationId) {
    const text = `
      UPDATE webhook_subscriptions
      SET deleted_at = NOW()
      WHERE id = $1
        AND organization_id = $2
        AND deleted_at IS NULL
    `;

    await query(
      text,
      [id, organizationId],
      organizationId,
      { operation: 'DELETE', table: 'webhook_subscriptions' }
    );
  }

  /**
   * Trigger webhook event
   */
  async triggerEvent(eventType, eventData, organizationId) {
    // Find active subscriptions for this event type
    const subscriptions = await this.findSubscriptionsForEvent(
      eventType,
      organizationId
    );

    if (subscriptions.length === 0) {
      logger.debug('No subscriptions for event', { eventType, organizationId });
      return;
    }

    logger.info('Triggering webhook event', {
      eventType,
      subscriptionCount: subscriptions.length,
      organizationId
    });

    // Create event records
    const eventPromises = subscriptions.map(subscription =>
      this.createEventRecord(subscription, eventType, eventData, organizationId)
    );

    await Promise.all(eventPromises);

    // Deliver events asynchronously
    subscriptions.forEach(subscription => {
      this.deliverEventAsync(subscription, eventType, eventData);
    });
  }

  /**
   * Find subscriptions for event type
   */
  async findSubscriptionsForEvent(eventType, organizationId) {
    const text = `
      SELECT *
      FROM webhook_subscriptions
      WHERE organization_id = $1
        AND $2 = ANY(events)
        AND is_active = true
        AND deleted_at IS NULL
        AND consecutive_failures < 10
    `;

    const result = await query(
      text,
      [organizationId, eventType],
      organizationId,
      { operation: 'SELECT', table: 'webhook_subscriptions' }
    );

    return result.rows;
  }

  /**
   * Create event record
   */
  async createEventRecord(subscription, eventType, eventData, organizationId) {
    const eventId = uuidv4();

    const payload = {
      id: eventId,
      type: eventType,
      timestamp: new Date().toISOString(),
      data: eventData
    };

    const text = `
      INSERT INTO webhook_events (
        id, subscription_id, organization_id,
        event_type, event_data, request_body
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await query(
      text,
      [
        eventId,
        subscription.id,
        organizationId,
        eventType,
        eventData,
        payload
      ],
      organizationId,
      { operation: 'INSERT', table: 'webhook_events' }
    );

    return result.rows[0];
  }

  /**
   * Deliver event asynchronously
   */
  async deliverEventAsync(subscription, eventType, eventData) {
    // Run in background (could use queue like Bull/BullMQ)
    setImmediate(async () => {
      try {
        await this.deliverEvent(subscription, eventType, eventData);
      } catch (error) {
        logger.error('Failed to deliver webhook event', {
          subscriptionId: subscription.id,
          eventType,
          error: error.message
        });
      }
    });
  }

  /**
   * Deliver event to webhook URL
   */
  async deliverEvent(subscription, eventType, eventData) {
    const eventId = uuidv4();

    const payload = {
      id: eventId,
      type: eventType,
      timestamp: new Date().toISOString(),
      data: eventData
    };

    // Generate signature
    const signature = this.generateSignature(payload, subscription.secret);

    try {
      const response = await axios.post(subscription.url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RecruitIQ-Webhooks/1.0',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event-Type': eventType,
          'X-Webhook-Event-Id': eventId
        },
        timeout: 10000  // 10 second timeout
      });

      // Record successful delivery
      await this.recordDeliverySuccess(
        subscription.id,
        eventId,
        response.status,
        response.data
      );

      logger.info('Webhook delivered successfully', {
        subscriptionId: subscription.id,
        eventType,
        status: response.status
      });
    } catch (error) {
      // Record failed delivery
      await this.recordDeliveryFailure(
        subscription.id,
        eventId,
        error
      );

      logger.error('Webhook delivery failed', {
        subscriptionId: subscription.id,
        eventType,
        error: error.message
      });

      // Schedule retry
      await this.scheduleRetry(subscription.id, eventId);
    }
  }

  /**
   * Generate HMAC signature
   */
  generateSignature(payload, secret) {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Record successful delivery
   */
  async recordDeliverySuccess(subscriptionId, eventId, status, responseData) {
    // Update event record
    await query(`
      UPDATE webhook_events
      SET 
        status = 'delivered',
        delivered_at = NOW(),
        response_status = $1,
        response_body = $2,
        last_attempt_at = NOW(),
        attempts = attempts + 1
      WHERE id = $3
    `, [status, JSON.stringify(responseData), eventId]);

    // Update subscription stats
    await query(`
      UPDATE webhook_subscriptions
      SET 
        total_deliveries = total_deliveries + 1,
        successful_deliveries = successful_deliveries + 1,
        last_delivery_at = NOW(),
        last_success_at = NOW(),
        consecutive_failures = 0
      WHERE id = $1
    `, [subscriptionId]);
  }

  /**
   * Record failed delivery
   */
  async recordDeliveryFailure(subscriptionId, eventId, error) {
    const errorMessage = error.message;
    const responseStatus = error.response?.status;
    const responseBody = error.response?.data;

    // Update event record
    await query(`
      UPDATE webhook_events
      SET 
        status = 'failed',
        error_message = $1,
        response_status = $2,
        response_body = $3,
        last_attempt_at = NOW(),
        attempts = attempts + 1
      WHERE id = $4
    `, [errorMessage, responseStatus, JSON.stringify(responseBody), eventId]);

    // Update subscription stats
    await query(`
      UPDATE webhook_subscriptions
      SET 
        total_deliveries = total_deliveries + 1,
        failed_deliveries = failed_deliveries + 1,
        last_delivery_at = NOW(),
        last_failure_at = NOW(),
        consecutive_failures = consecutive_failures + 1
      WHERE id = $1
    `, [subscriptionId]);

    // Disable subscription after 10 consecutive failures
    await query(`
      UPDATE webhook_subscriptions
      SET is_active = false
      WHERE id = $1 AND consecutive_failures >= 10
    `, [subscriptionId]);
  }

  /**
   * Schedule retry
   */
  async scheduleRetry(subscriptionId, eventId) {
    const subscription = await query(`
      SELECT max_retries, retry_delay_seconds
      FROM webhook_subscriptions
      WHERE id = $1
    `, [subscriptionId]);

    if (subscription.rows.length === 0) return;

    const { max_retries, retry_delay_seconds } = subscription.rows[0];

    const event = await query(`
      SELECT attempts
      FROM webhook_events
      WHERE id = $1
    `, [eventId]);

    if (event.rows.length === 0) return;

    const attempts = event.rows[0].attempts;

    if (attempts < max_retries) {
      // Schedule next retry
      const nextRetryAt = new Date(Date.now() + retry_delay_seconds * 1000);

      await query(`
        UPDATE webhook_events
        SET next_retry_at = $1
        WHERE id = $2
      `, [nextRetryAt, eventId]);
    }
  }

  /**
   * Retry failed events
   * (Should be called by background worker)
   */
  async retryFailedEvents() {
    const text = `
      SELECT we.*, ws.url, ws.secret, ws.events
      FROM webhook_events we
      JOIN webhook_subscriptions ws ON we.subscription_id = ws.id
      WHERE we.status = 'failed'
        AND we.next_retry_at IS NOT NULL
        AND we.next_retry_at <= NOW()
        AND ws.is_active = true
        AND ws.deleted_at IS NULL
      LIMIT 100
    `;

    const result = await query(text, []);

    for (const event of result.rows) {
      await this.deliverEvent(
        {
          id: event.subscription_id,
          url: event.url,
          secret: event.secret
        },
        event.event_type,
        event.event_data
      );
    }
  }
}

export default new WebhookService();
```

### 3. Webhook Routes

**File:** `backend/src/routes/webhooks.js`

```javascript
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import WebhookService from '../services/WebhookService.js';

const router = express.Router();

/**
 * List webhook subscriptions
 */
router.get('/',
  authenticate,
  async (req, res, next) => {
    try {
      const { organizationId } = req.user;
      
      const subscriptions = await WebhookService.listSubscriptions(organizationId);
      
      return res.status(200).json({
        success: true,
        webhooks: subscriptions
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Create webhook subscription
 */
router.post('/',
  authenticate,
  async (req, res, next) => {
    try {
      const { organizationId, id: userId } = req.user;
      
      const subscription = await WebhookService.createSubscription(
        req.body,
        organizationId,
        userId
      );
      
      return res.status(201).json({
        success: true,
        webhook: subscription
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update webhook subscription
 */
router.put('/:id',
  authenticate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { organizationId, id: userId } = req.user;
      
      const subscription = await WebhookService.updateSubscription(
        id,
        req.body,
        organizationId,
        userId
      );
      
      return res.status(200).json({
        success: true,
        webhook: subscription
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Delete webhook subscription
 */
router.delete('/:id',
  authenticate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { organizationId } = req.user;
      
      await WebhookService.deleteSubscription(id, organizationId);
      
      return res.status(200).json({
        success: true,
        message: 'Webhook subscription deleted'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * List webhook events
 */
router.get('/:id/events',
  authenticate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { organizationId } = req.user;
      
      const events = await WebhookService.listEvents(id, organizationId);
      
      return res.status(200).json({
        success: true,
        events
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Test webhook
 */
router.post('/:id/test',
  authenticate,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { organizationId } = req.user;
      
      await WebhookService.testWebhook(id, organizationId);
      
      return res.status(200).json({
        success: true,
        message: 'Test event sent'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * List available event types
 */
router.get('/event-types',
  authenticate,
  async (req, res, next) => {
    try {
      const eventTypes = await WebhookService.listEventTypes();
      
      return res.status(200).json({
        success: true,
        eventTypes
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

### 4. Trigger Webhooks from Services

**File:** `backend/src/services/jobs/JobService.js`

```javascript
import WebhookService from '../WebhookService.js';

class JobService {
  async create(data, organizationId, userId) {
    // ... existing create logic ...
    
    const job = await this.repository.create(jobData);
    
    // Trigger webhook event
    await WebhookService.triggerEvent(
      'job.created',
      { job },
      organizationId
    );
    
    return job;
  }

  async publish(id, organizationId, userId) {
    // ... publish logic ...
    
    const job = await this.repository.update(
      id,
      { status: 'open', isPublished: true },
      organizationId
    );
    
    // Trigger webhook event
    await WebhookService.triggerEvent(
      'job.published',
      { job },
      organizationId
    );
    
    return job;
  }
}
```

---

## Testing Strategy (Abbreviated)

### Unit Tests

```javascript
describe('WebhookService', () => {
  it('should generate valid signature', () => {
    const payload = { id: '123', type: 'test' };
    const secret = 'secret123';
    
    const signature = WebhookService.generateSignature(payload, secret);
    
    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it('should verify signature correctly', () => {
    const payload = { id: '123', type: 'test' };
    const secret = 'secret123';
    
    const signature = WebhookService.generateSignature(payload, secret);
    const isValid = WebhookService.verifySignature(payload, signature, secret);
    
    expect(isValid).toBe(true);
  });
});
```

---

## Rollout Plan

### Day 1-2: Database & Core
- [ ] Create database schema
- [ ] Implement WebhookService
- [ ] Add signature generation/verification

### Day 3-4: Delivery System
- [ ] Implement event delivery
- [ ] Add retry logic
- [ ] Create background worker

### Day 5-6: Integration
- [ ] Add webhook routes
- [ ] Trigger events from services
- [ ] Test with real endpoints

### Day 7: Documentation & Deployment
- [ ] Create webhook documentation
- [ ] Deploy to production
- [ ] Monitor delivery rates

---

## Success Criteria

- ✅ Webhooks deliver within 1 second of event
- ✅ 99.9% delivery success rate
- ✅ Automatic retries for failures
- ✅ Signature verification prevents tampering
- ✅ 90% reduction in polling requests

---

## Documentation

Add to `docs/API_STANDARDS.md`:

````markdown
## Webhooks

Subscribe to events and receive real-time notifications.

### Creating a Subscription

```http
POST /api/v1/webhooks
{
  "url": "https://your-domain.com/webhooks",
  "events": ["job.created", "application.received"],
  "description": "Production webhook"
}
```

### Event Payload

```json
{
  "id": "evt_123abc",
  "type": "job.created",
  "timestamp": "2025-11-16T10:30:00Z",
  "data": {
    "job": { "id": "123", "title": "Developer" }
  }
}
```

### Verifying Signatures

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expected = `sha256=${hmac.digest('hex')}`;
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```
````

---

## References

- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [GitHub Webhooks](https://docs.github.com/en/webhooks)
- [Webhook Best Practices](https://webhooks.fyi/)
